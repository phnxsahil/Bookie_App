
const fs = require("fs");
const path = require("path");

function loadEnvLocalIfNeeded() {
    if (process.env.GEMINI_API_KEY) return;

    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIndex = line.indexOf("=");
        if (eqIndex < 0) continue;
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !(key in process.env)) {
            process.env[key] = value;
        }
    }
}

async function testGeminiKey() {
    loadEnvLocalIfNeeded();
    const key = process.env.GEMINI_API_KEY;
    const configuredModel = process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim();
    const defaultModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
    const models = configuredModel
        ? [configuredModel, ...defaultModels.filter((model) => model !== configuredModel)]
        : defaultModels;

    console.log("GEMINI_API_KEY:", key ? "SET" : "NOT SET");
    if (!key) {
        console.error("Missing GEMINI_API_KEY. Add it to .env.local or your shell env.");
        process.exit(1);
    }

    const body = {
        contents: [{ parts: [{ text: "Reply with exactly: OK" }] }],
    };

    try {
        for (const model of models) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Gemini model check failed (${response.status}) for ${model}`);
                console.error(errorText);
                if (response.status === 404) continue;
                process.exit(1);
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log("Gemini key test passed.");
            console.log("Model used:", model);
            console.log("Model response:", text.trim() || "(empty)");
            return;
        }

        console.error("Gemini key test failed: no supported model found from fallback list.");
        process.exit(1);
    } catch (err) {
        console.error("Gemini key test request failed:", err);
        process.exit(1);
    }
}

testGeminiKey();
