import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check (TASKS T0.3). Verifies the server can reach Supabase with the
 * configured keys by hitting the Supabase Auth (GoTrue) settings endpoint.
 *   - 200 { ok: true,  supabase: "connected" }       → T0.3 "Done when" passes
 *   - 503 { ok: false, supabase: "not_configured" }  → keys still placeholders
 *   - 502 { ok: false, supabase: "unreachable" }     → bad URL/key or network
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey || url.includes("placeholder")) {
    return NextResponse.json(
      {
        ok: false,
        supabase: "not_configured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (TASKS T0.3).",
      },
      { status: 503 },
    );
  }

  try {
    // 200 only when the URL is reachable AND the publishable key is valid.
    // Note: opaque sb_publishable_… keys are NOT JWTs, so they go in the
    // `apikey` header only — never as an Authorization Bearer token.
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
    });
    return NextResponse.json(
      {
        ok: res.ok,
        supabase: res.ok ? "connected" : "unreachable",
        status: res.status,
      },
      { status: res.ok ? 200 : 502 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        supabase: "error",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 502 },
    );
  }
}
