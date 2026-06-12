"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Turn reminder emails on or off after sign-up (fills the post-signup gap;
// also the target of the email unsubscribe link's opposite). RLS scopes the
// update to the owner.
export async function updateReminderOptIn(formData: FormData): Promise<void> {
  const { supabase, user } = await currentUser();
  const optIn = formData.get("emailReminders") != null;
  await supabase
    .from("profiles")
    .update({ email_reminders_opt_in: optIn })
    .eq("id", user.id);
  revalidatePath("/settings");
}

// Save the user's home city + coordinates. Future business searches bias their
// autocomplete to a radius around this point. RLS scopes the update to the owner.
export async function setHomeCity(input: {
  label: string;
  lat: number;
  lng: number;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  const label = input.label.trim();
  if (
    !label ||
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng)
  ) {
    return { error: "Pick a city from the list." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ home_city: label, home_lat: input.lat, home_lng: input.lng })
    .eq("id", user.id);
  if (error) return { error: "Could not save your city. Try again." };
  revalidatePath("/settings");
  return {};
}

export async function clearHomeCity(): Promise<void> {
  const { supabase, user } = await currentUser();
  await supabase
    .from("profiles")
    .update({ home_city: null, home_lat: null, home_lng: null })
    .eq("id", user.id);
  revalidatePath("/settings");
}

// T9.2 — permanently delete the account. Removing the auth user cascades to the
// profile and every owned row (spots → services → appointments → reminders, all
// FK on delete cascade), so no manual cleanup is needed. Requires the admin
// (service-role) client.
export async function deleteAccount(): Promise<void> {
  const { supabase, user } = await currentUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return; // leave the user signed in; nothing was deleted
  await supabase.auth.signOut();
  redirect("/");
}
