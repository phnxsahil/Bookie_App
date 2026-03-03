import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/backend/database/server";

/**
 * GET /api/auth/google/callback
 * Receives the OAuth code from Google, exchanges it for tokens
 * directly with Google (no supabase.co involved), then signs the
 * user into Supabase via signInWithIdToken() which routes through
 * JioBase (abstrabit-project.jiobase.com) — not blocked.
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const origin = url.origin;

    if (error) {
        console.error("[Google Callback] OAuth error:", error, url.searchParams.get("error_description"));
        return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`);
    }

    // Verify CSRF state
    const savedState = request.cookies.get("oauth_state")?.value;
    if (!state || state !== savedState) {
        console.error("[Google Callback] State mismatch — possible CSRF");
        return NextResponse.redirect(`${origin}/?auth_error=state_mismatch`);
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/?auth_error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const callbackUrl = `${origin}/api/auth/google/callback`;

    // 1) Exchange authorization code → Google tokens
    let idToken: string;
    try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: callbackUrl,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenRes.ok) {
            const body = await tokenRes.text();
            console.error("[Google Callback] Token exchange failed:", body);
            return NextResponse.redirect(`${origin}/?auth_error=token_exchange_failed`);
        }

        const tokens = (await tokenRes.json()) as { id_token?: string };
        if (!tokens.id_token) {
            console.error("[Google Callback] No id_token in response");
            return NextResponse.redirect(`${origin}/?auth_error=no_id_token`);
        }

        idToken = tokens.id_token;
    } catch (err) {
        console.error("[Google Callback] Network error during token exchange:", err);
        return NextResponse.redirect(`${origin}/?auth_error=network_error`);
    }

    // 2) Sign in to Supabase using the Google id_token
    //    This call routes through JioBase → not DNS-blocked.
    try {
        const supabase = await createClient();
        const { error: signInError } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
        });

        if (signInError) {
            console.error("[Google Callback] Supabase signInWithIdToken error:", signInError.message);
            return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(signInError.message)}`);
        }
    } catch (err) {
        console.error("[Google Callback] Supabase sign-in error:", err);
        return NextResponse.redirect(`${origin}/?auth_error=supabase_signin_failed`);
    }

    // Clear the state cookie and redirect to dashboard
    const response = NextResponse.redirect(`${origin}/`);
    response.cookies.delete("oauth_state");
    return response;
}
