"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  nextDueDate,
  reminderSendAt,
  todayInTimeZone,
} from "@/lib/domain/scheduling";
import type { Database } from "@/types/database.types";
import type { PlaceDetails } from "@/types/places";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type BookingMethod = Database["public"]["Enums"]["booking_method"];
type FrequencyUnit = Database["public"]["Enums"]["frequency_unit"];

export type NewServiceInput = {
  name: string;
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  anchorDate: string | null;
};

export type CreateSpotInput = {
  place: PlaceDetails;
  bookingMethod: BookingMethod;
  bookingUrl: string | null;
  services: NewServiceInput[];
};

async function userTimezone(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  return data?.timezone ?? "America/Toronto";
}

function firstDueDate(
  anchorDate: string | null,
  value: number,
  unit: FrequencyUnit,
  tz: string,
): string {
  // With a last-visit date, the next visit is anchor + frequency; otherwise the
  // service is due now (and self-corrects after the first completed visit).
  return anchorDate ? nextDueDate(anchorDate, value, unit) : todayInTimeZone(tz);
}

// T4.3 — seed the first cycle for a new service: a `due` appointment + a
// `due_soon` reminder 7 days ahead. Scheduling logic stays in TS (not DB
// triggers), per DESIGN §10.1.
async function seedCycle(
  supabase: SupabaseServerClient,
  args: { userId: string; spotId: string; serviceId: string; dueDate: string },
): Promise<void> {
  const { data: appt } = await supabase
    .from("appointments")
    .insert({
      user_id: args.userId,
      spot_id: args.spotId,
      service_id: args.serviceId,
      status: "due",
      due_date: args.dueDate,
    })
    .select("id")
    .single();
  if (!appt) return;

  await supabase.from("reminders").insert({
    user_id: args.userId,
    appointment_id: appt.id,
    type: "due_soon",
    channel: "email",
    send_at: reminderSendAt(args.dueDate),
  });
}

// T3.3 — save a searched place as a spot, with its services (T3.4), booking
// method (T3.5), and a seeded first cycle per service (T4.3).
export async function createSpot(
  input: CreateSpotInput,
): Promise<{ error?: string; spotId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { place, bookingMethod, bookingUrl, services } = input;
  if (!place?.name?.trim()) {
    return { error: "Enter a business name." };
  }
  const clean = services.filter(
    (s) => s.name.trim() && Number.isInteger(s.frequencyValue) && s.frequencyValue > 0,
  );
  if (clean.length === 0) {
    return { error: "Add at least one service with a positive frequency." };
  }

  const tz = await userTimezone(supabase, user.id);

  const { data: spot, error: spotErr } = await supabase
    .from("spots")
    .insert({
      user_id: user.id,
      google_place_id: place.googlePlaceId || null,
      name: place.name.trim(),
      formatted_address: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      phone: place.phone,
      website_url: place.websiteUrl,
      booking_url:
        bookingMethod === "website" ? bookingUrl ?? place.websiteUrl : null,
      booking_method: bookingMethod,
      opening_hours: place.openingHours,
      google_maps_uri: place.googleMapsUri,
    })
    .select("id")
    .single();

  if (spotErr) {
    if (spotErr.code === "23505") {
      return { error: "You've already saved this business." };
    }
    return { error: spotErr.message };
  }
  if (!spot) return { error: "Could not save the spot. Please try again." };

  const { data: insertedServices, error: svcErr } = await supabase
    .from("services")
    .insert(
      clean.map((s) => ({
        user_id: user.id,
        spot_id: spot.id,
        name: s.name.trim(),
        frequency_value: s.frequencyValue,
        frequency_unit: s.frequencyUnit,
        anchor_date: s.anchorDate,
      })),
    )
    .select("id, spot_id, frequency_value, frequency_unit, anchor_date");
  if (svcErr) {
    return {
      error: `Saved the spot, but adding services failed: ${svcErr.message}`,
      spotId: spot.id,
    };
  }

  for (const sv of insertedServices ?? []) {
    await seedCycle(supabase, {
      userId: user.id,
      spotId: sv.spot_id,
      serviceId: sv.id,
      dueDate: firstDueDate(
        sv.anchor_date,
        sv.frequency_value,
        sv.frequency_unit,
        tz,
      ),
    });
  }

  revalidatePath("/spots");
  revalidatePath("/dashboard");
  return { spotId: spot.id };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// T3.4 — add another service to an existing spot (also seeds its first cycle).
export async function addService(
  spotId: string,
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: spot } = await supabase
    .from("spots")
    .select("id")
    .eq("id", spotId)
    .single();
  if (!spot) return;

  const name = String(formData.get("name") ?? "").trim();
  const frequencyValue = Number(formData.get("frequencyValue"));
  const frequencyUnit = String(
    formData.get("frequencyUnit") ?? "week",
  ) as FrequencyUnit;
  const anchor = String(formData.get("anchorDate") ?? "").trim() || null;
  if (!name || !Number.isInteger(frequencyValue) || frequencyValue <= 0) return;

  const { data: service } = await supabase
    .from("services")
    .insert({
      user_id: user.id,
      spot_id: spotId,
      name,
      frequency_value: frequencyValue,
      frequency_unit: frequencyUnit,
      anchor_date: anchor,
    })
    .select("id")
    .single();

  if (service) {
    const tz = await userTimezone(supabase, user.id);
    await seedCycle(supabase, {
      userId: user.id,
      spotId,
      serviceId: service.id,
      dueDate: firstDueDate(anchor, frequencyValue, frequencyUnit, tz),
    });
  }

  revalidatePath(`/spots/${spotId}`);
  revalidatePath("/dashboard");
}

// Edit a service's name, frequency, and last-visit (anchor) date. If a
// last-visit date is provided, recompute the open `due` appointment's due date
// (anchor + frequency) and shift its unsent reminder to match — this is how a
// forgotten "last visit" gets corrected without deleting the service. Clearing
// the date leaves the existing due date untouched (no unambiguous reference to
// recompute from), and a `booked` appointment is never overridden.
export async function updateService(
  serviceId: string,
  spotId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const frequencyValue = Number(formData.get("frequencyValue"));
  const frequencyUnit = String(
    formData.get("frequencyUnit") ?? "week",
  ) as FrequencyUnit;
  const anchor = String(formData.get("anchorDate") ?? "").trim() || null;
  if (!name || !Number.isInteger(frequencyValue) || frequencyValue <= 0) return;

  await supabase
    .from("services")
    .update({
      name,
      frequency_value: frequencyValue,
      frequency_unit: frequencyUnit,
      anchor_date: anchor,
    })
    .eq("id", serviceId);

  if (anchor) {
    const newDue = nextDueDate(anchor, frequencyValue, frequencyUnit);
    const { data: appt } = await supabase
      .from("appointments")
      .select("id")
      .eq("service_id", serviceId)
      .eq("status", "due")
      .maybeSingle();
    if (appt) {
      await supabase
        .from("appointments")
        .update({ due_date: newDue })
        .eq("id", appt.id);
      await supabase
        .from("reminders")
        .update({ send_at: reminderSendAt(newDue) })
        .eq("appointment_id", appt.id)
        .eq("type", "due_soon")
        .eq("sent", false);
    }
  }

  revalidatePath(`/spots/${spotId}`);
  revalidatePath("/dashboard");
}

// Removing a service cascades its appointments + reminders (FK on delete).
export async function deleteService(
  serviceId: string,
  spotId: string,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("services").delete().eq("id", serviceId);
  revalidatePath(`/spots/${spotId}`);
  revalidatePath("/dashboard");
}

// T3.5 — change how booking is done for a spot.
export async function updateBooking(
  spotId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const bookingMethod = String(
    formData.get("bookingMethod") ?? "other",
  ) as BookingMethod;
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  await supabase
    .from("spots")
    .update({
      booking_method: bookingMethod,
      booking_url: bookingMethod === "website" ? bookingUrl || null : null,
    })
    .eq("id", spotId);
  revalidatePath(`/spots/${spotId}`);
}

// T3.7 — delete a spot (cascades services + appointments + reminders).
export async function deleteSpot(spotId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("spots").delete().eq("id", spotId);
  revalidatePath("/spots");
  revalidatePath("/dashboard");
  redirect("/spots");
}
