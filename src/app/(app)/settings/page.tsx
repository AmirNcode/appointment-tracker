import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { updateReminderOptIn } from "@/actions/account";
import { signOut } from "@/actions/auth";
import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { HomeCity } from "@/components/account/home-city";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null; // (app)/layout guards this

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_reminders_opt_in, timezone, home_city")
    .eq("id", user.id)
    .single();
  const optedIn = profile?.email_reminders_opt_in ?? false;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-semibold">Settings ⚙️</h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
      </p>

      {/* Home city */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Home city 🏙️
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Set where you mostly book. New place searches will favour spots in
          your city and the surrounding area.
        </p>
        <HomeCity currentCity={profile?.home_city ?? null} />
      </section>

      {/* Email reminders */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Email reminders 💌
        </h2>
        <form action={updateReminderOptIn} className="card mt-3 p-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="emailReminders"
              defaultChecked={optedIn}
              className="mt-0.5 h-5 w-5 accent-[var(--accent)]"
            />
            <span>Email me a gentle nudge when an appointment is due.</span>
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Timezone: {profile?.timezone ?? "America/Toronto"}
            </p>
            <button type="submit" className="btn btn-secondary btn-sm">
              Save
            </button>
          </div>
        </form>
      </section>

      {/* Account */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Account
        </h2>
        <form action={signOut} className="mt-3">
          <button type="submit" className="btn btn-secondary">
            Log out
          </button>
        </form>
      </section>

      {/* Danger zone */}
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-danger">
          Danger zone
        </h2>
        <p className="mt-2 text-sm text-muted">
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
