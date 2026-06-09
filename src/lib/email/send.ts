import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";

type Attachment = { filename: string; content: Buffer | string };

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** When provided, adds RFC 8058 List-Unsubscribe (+ one-click) headers. */
  unsubscribeUrl?: string;
  /** Tags the message type (X-Email-Type header) for filtering/analytics. */
  tag?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
};

// T6.1 — central send wrapper. Reads the verified sender from EMAIL_FROM; all
// reminder sends pass an unsubscribeUrl so every reminder carries a working
// unsubscribe (CASL). Opt-in is enforced upstream (the cron only queries
// opted-in users). Returns a plain result so callers can treat email as
// best-effort and never crash a request on a send failure.
export async function sendEmail(
  args: SendEmailArgs,
): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)." };
  }

  const resend = new Resend(apiKey);
  const headers: Record<string, string> = {
    ...(args.tag ? { "X-Email-Type": args.tag } : {}),
    ...(args.unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${args.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : {}),
    ...args.headers,
  };
  const replyTo = process.env.EMAIL_REPLY_TO;

  const { data, error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    react: args.react,
    headers,
    ...(replyTo ? { replyTo } : {}),
    ...(args.attachments ? { attachments: args.attachments } : {}),
  });
  if (error) return { error: error.message };
  return { id: data?.id };
}
