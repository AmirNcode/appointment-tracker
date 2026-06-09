import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

// T6.3 — flip the user's reminder opt-in off from a signed token. No session:
// the user clicks/POSTs straight from their email client.
async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const userId = verifyUnsubToken(token);
  if (!userId) return false;
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ email_reminders_opt_in: false })
    .eq("id", userId);
  return !error;
}

function htmlPage(message: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:64px auto;padding:0 24px;color:#111827"><h1 style="font-size:20px;font-weight:600">${message}</h1></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// One-click unsubscribe (RFC 8058): mail clients POST here.
export async function POST(req: NextRequest) {
  const ok = await unsubscribe(req.nextUrl.searchParams.get("token"));
  return new Response(ok ? "Unsubscribed" : "Invalid token", {
    status: ok ? 200 : 400,
  });
}

// Manual click from the email opens this in a browser.
export async function GET(req: NextRequest) {
  const ok = await unsubscribe(req.nextUrl.searchParams.get("token"));
  return htmlPage(
    ok
      ? "You've been unsubscribed from reminder emails."
      : "This unsubscribe link is invalid or expired.",
  );
}
