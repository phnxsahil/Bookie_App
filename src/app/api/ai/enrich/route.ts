import { NextResponse } from "next/server";
import { enrichBookmark } from "@/backend/ai/enrich";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id.trim() : "";
        const url = typeof body?.url === "string" ? body.url.trim() : "";
        const title = typeof body?.title === "string" ? body.title.trim() : "";

        if (!id || !url) {
            return NextResponse.json(
                { error: "Invalid request body. 'id' and 'url' are required." },
                { status: 400 }
            );
        }

        if (!UUID_REGEX.test(id)) {
            return NextResponse.json(
                { error: "Invalid request body. 'id' must be a valid UUID." },
                { status: 400 }
            );
        }

        const result = await enrichBookmark({ id, url, title });
        return NextResponse.json(result);
    } catch (error) {
        console.error("[API] AI Enrichment API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
