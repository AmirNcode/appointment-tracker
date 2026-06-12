import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { AppNav } from "@/components/app-nav";

/**
 * Authenticated app shell (TASKS T1.5 — route protection).
 *
 * Uses getUser() (which revalidates the token with Supabase) rather than
 * getSession(), per Supabase's SSR guidance. Any route under (app) requires
 * a signed-in user; otherwise we redirect to /login.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Leave room for the fixed bottom tab bar (+ iOS home indicator). */}
      <div className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <AppNav />
    </div>
  );
}
