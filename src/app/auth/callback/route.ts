import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + email-confirmation callback (TASKS T1.1, and later T1.3).
 *
 * Works with Supabase's DEFAULT email template — no template edit or custom
 * SMTP required. `signUp` sets `emailRedirectTo` to this route, so the
 * confirmation link returns here as `?code=...`, which we exchange for a
 * session (PKCE).
 *
 * (The token-hash variant in /auth/confirm is the more robust, cross-device
 * flow we'll switch to once custom SMTP/Resend is configured in Phase 6 and the
 * email template becomes editable.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Could not confirm your email. The link may be invalid or expired.",
    )}`,
  );
}
