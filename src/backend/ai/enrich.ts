import { createClient } from "@/backend/database/server";

const GEMINI_TIMEOUT_MS = 25000;
const DEFAULT_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_CATEGORIES = [
    "Technology",
    "News",
    "Design",
    "Education",
    "Entertainment",
    "Shopping",
    "Productivity",
    "Health",
    "Social",
    "Business",
    "Music",
    "Tool",
];

type EnrichmentPayload = {
    title?: string;
    summary?: string;
    category?: string;
};
type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
};

const FALLBACK_SUMMARY = "Could not analyze this link. Try again later.";
const FALLBACK_CATEGORY = "Other";

function normalizeCategory(category: string | undefined): string {
    if (!category) return "Other";
    const normalized = category.trim().toLowerCase();
    const matched = VALID_CATEGORIES.find((value) => value.toLowerCase() === normalized);
    return matched || "Other";
}

function parseModelJson(resultText: string): EnrichmentPayload {
    const cleaned = resultText
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonCandidate =
        firstBrace >= 0 && lastBrace > firstBrace
            ? cleaned.slice(firstBrace, lastBrace + 1)
            : cleaned;

    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;

    return {
        title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : undefined,
        category: typeof parsed.category === "string" ? parsed.category.trim() : undefined,
    };
}

function getGeminiModelCandidates() {
    const configured = process.env.GEMINI_MODEL?.trim();
    if (!configured) return DEFAULT_GEMINI_MODELS;
    return [configured, ...DEFAULT_GEMINI_MODELS.filter((model) => model !== configured)];
}

export async function enrichBookmark({ id, url, title }: { id: string; url: string; title: string }) {
    const hasValidId = UUID_REGEX.test(id);

    try {
        if (!hasValidId) {
            console.error(`[AI Enrich] Skipping enrichment: invalid bookmark id "${id}"`);
            return { title, summary: FALLBACK_SUMMARY, category: FALLBACK_CATEGORY };
        }

        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            console.error("[AI Enrich] GEMINI_API_KEY is not set in environment variables");
            throw new Error("AI Service Unavailable");
        }

        const prompt = `You are a helpful assistant that categorizes and summarizes web bookmarks.
URL: ${url}
User-provided Title: ${title}

Provide a JSON response with exactly three fields:
1. "title": A catchy, descriptive title for this bookmark (max 6 words). If the user-provided title is already good, enhance it slightly.
2. "summary": A concise, insightful 1-sentence summary of what this website/page is about and why it's useful.
3. "category": A single-word category from this list: Technology, News, Design, Education, Entertainment, Shopping, Productivity, Health, Social, Business, Music, Tool.

Response format: {"title": "...", "summary": "...", "category": "..."}`;

        console.log(`[AI Enrich] Starting enrichment for bookmark ${id} (${url})`);

        const modelCandidates = getGeminiModelCandidates();
        let data: GeminiResponse | null = null;
        let selectedModel = "";
        let lastGeminiError = "";

        for (const model of modelCandidates) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            response_mime_type: "application/json",
                        },
                    }),
                    signal: controller.signal,
                }
            ).finally(() => clearTimeout(timeoutId));

            if (response.ok) {
                data = await response.json();
                selectedModel = model;
                break;
            }

            const errorText = await response.text();
            lastGeminiError = errorText;
            console.error(`[AI Enrich] Gemini API Error (${response.status}) on model ${model}:`, errorText);
            if (response.status !== 404) {
                throw new Error(`Gemini API returned ${response.status}`);
            }
        }

        if (!data) {
            throw new Error(`No supported Gemini model found. Last API error: ${lastGeminiError || "unknown"}`);
        }

        console.log(`[AI Enrich] Using Gemini model: ${selectedModel}`);
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {
            console.error("[AI Enrich] Invalid AI response:", JSON.stringify(data, null, 2));
            throw new Error("Invalid AI response");
        }

        const parsed = parseModelJson(resultText);
        const aiTitle = parsed.title || title;
        const summary = parsed.summary || "No summary available.";
        const category = normalizeCategory(parsed.category);

        const supabase = await createClient();
        const { error: updateError } = await supabase
            .from("bookmarks")
            .update({
                title: aiTitle,
                ai_summary: summary,
                ai_category: category,
            })
            .eq("id", id);

        if (updateError) {
            console.error("[AI Enrich] Supabase Update Error:", updateError);
            throw new Error("Failed to save AI insights");
        }

        console.log(`[AI Enrich] Success for ${id}: title="${aiTitle}", category="${category}"`);

        return { title: aiTitle, summary, category };
    } catch (error) {
        console.error("[AI Enrich] Error:", error);

        // Fallback: at least clear the "enriching" state with defaults
        try {
            if (!hasValidId) {
                return { title, summary: FALLBACK_SUMMARY, category: FALLBACK_CATEGORY };
            }
            const supabase = await createClient();
            await supabase
                .from("bookmarks")
                .update({
                    ai_summary: FALLBACK_SUMMARY,
                    ai_category: FALLBACK_CATEGORY,
                })
                .eq("id", id);
        } catch (fallbackErr) {
            console.error("[AI Enrich] Fallback update failed:", fallbackErr);
        }
        return { title, summary: FALLBACK_SUMMARY, category: FALLBACK_CATEGORY };
    }
}
