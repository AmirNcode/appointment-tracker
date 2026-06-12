import { cache } from "react";
import { createClient } from "./server";

/**
 * The signed-in user, memoized per request with React `cache()`.
 *
 * `getUser()` makes a network round-trip to Supabase to revalidate the JWT.
 * The (app) layout and the page it renders both need the user, so without
 * memoization that's two serial auth calls per navigation. `cache()` collapses
 * them into one for the duration of a single server render.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
