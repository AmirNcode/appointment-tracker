"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { WelcomeEmail } from "@/emails/welcome";
import type { AuthState } from "@/lib/auth/types";

// T1.2 — Email/password login. On success, redirects to the dashboard.
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// T1.1 — Email/password sign-up. Email confirmation is ON, so no session is
// created here; the user must click the confirmation link (handled by
// /auth/confirm) before they can log in.
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const optIn = formData.get("emailReminders") != null; // checkbox present = checked

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const origin =
    (await headers()).get("origin") ??
    process.env.APP_URL ??
    "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    return { error: error.message };
  }

  const userId = data.user?.id;
  if (userId) {
    // T6.3 — persist the reminder opt-in. The profile row is created by the
    // handle_new_user trigger (default opt-in false), and the user has no
    // session yet (email unconfirmed), so flip it via the admin client.
    if (optIn) {
      await createAdminClient()
        .from("profiles")
        .update({ email_reminders_opt_in: true })
        .eq("id", userId);
    }
    // T6.6 — welcome email. Best-effort: never fail signup if it errors (the
    // Supabase confirmation email still goes out regardless).
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Beauty Scheduler",
        react: WelcomeEmail({ loginUrl: `${origin}/login`, optedIn: optIn }),
        tag: "welcome",
      });
    } catch {
      // ignore
    }
  }

  return {
    message:
      "Almost there — check your email (including spam) for a confirmation link to finish creating your account.",
  };
}

// T1.2 — Logout.
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
