import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
