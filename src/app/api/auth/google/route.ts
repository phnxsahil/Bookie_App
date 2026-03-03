import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/auth/google
 * Initiates a custom Google OAuth flow so the redirect_uri points
 * to OUR relay (/api/auth/google/callback) instead of
 * kgmaudrexzjyswhcwlgn.supabase.co (which is DNS-blocked in India).
 *
 * After Google calls our relay we exchange the code for a Google
 * id_token and sign the user in via supabase.auth.signInWithIdToken()
 * which hits JioBase → not blocked.
 */
export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/auth/google/callback`;

    // Random state to prevent CSRF
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
        state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Store state in a short-lived cookie so callback can verify it
    const response = NextResponse.redirect(googleAuthUrl);
    response.cookies.set("oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
    });

    return response;
}
