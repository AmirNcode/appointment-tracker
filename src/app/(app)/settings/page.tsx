import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateReminderOptIn } from "@/actions/account";
import { HomeLink } from "@/components/home-link";
import { DeleteAccountButton } from "@/components/account/delete-account-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // (app)/layout guards this

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_reminders_opt_in, timezone")
    .eq("id", user.id)
    .single();
  const optedIn = profile?.email_reminders_opt_in ?? false;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Dashboard
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <HomeLink />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>
      <p className="mt-4 text-sm text-foreground/70">
        Signed in as <span className="font-medium">{user.email}</span>.
      </p>

      {/* Email reminders */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Email reminders</h2>
        <form
          action={updateReminderOptIn}
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="emailReminders"
              defaultChecked={optedIn}
              className="h-4 w-4"
            />
            Email me when an appointment is due
          </label>
          <button
            type="submit"
            className="rounded-lg border border-foreground/20 px-3 py-1.5 text-sm font-medium"
          >
            Save
          </button>
        </form>
        <p className="mt-2 text-xs text-foreground/50">
          Timezone: {profile?.timezone ?? "America/Toronto"}
        </p>
      </section>

      {/* Danger zone */}
      <section className="mt-12 border-t border-foreground/10 pt-6">
        <h2 className="text-sm font-semibold text-red-600">Danger zone</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Deleting your account permanently removes your profile and all of your
          spots, services, appointments, and reminders.
        </p>
        <div className="mt-3">
          <DeleteAccountButton />
        </div>
      </section>
    </main>
  );
}
