async function main() {
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/api/ai/enrich`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: "test-id",
            url: "https://google.com",
            title: "Google",
        }),
    });

    const text = await response.text();
    let body = {};
    try {
        body = JSON.parse(text);
    } catch {
        body = { raw: text };
    }

    if (response.status !== 400) {
        console.error(`FAIL: expected 400, got ${response.status}`);
        console.error(body);
        process.exit(1);
    }

    const message = typeof body?.error === "string" ? body.error : "";
    if (!message.includes("id") || !message.includes("UUID")) {
        console.error("FAIL: expected UUID validation error message");
        console.error(body);
        process.exit(1);
    }

    console.log("PASS: API rejects invalid id before DB call.");
}

main().catch((err) => {
    console.error("FAIL: route guard test crashed");
    console.error(err);
    process.exit(1);
});
