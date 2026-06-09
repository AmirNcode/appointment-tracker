import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// T6.3 — stateless, tamper-proof unsubscribe tokens so an email link can flip a
// user's reminder opt-in with no session. Format: base64url(userId).hmac.
// Signed with CRON_SECRET (already a server-only secret).

function secret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET is not set");
  return s;
}

export function signUnsubToken(userId: string): string {
  const sig = createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${Buffer.from(userId).toString("base64url")}.${sig}`;
}

/** Returns the userId if the token is authentic, else null. */
export function verifyUnsubToken(token: string): string | null {
  const [idPart, sig] = token.split(".");
  if (!idPart || !sig) return null;

  let userId: string;
  try {
    userId = Buffer.from(idPart, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!userId) return null;

  const expected = createHmac("sha256", secret())
    .update(userId)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}
