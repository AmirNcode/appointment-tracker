import "server-only";
import type { Json } from "@/types/database.types";
import type { PlaceSuggestion, PlaceDetails } from "@/types/places";

// Server-side Google Places (New) client. The API key never leaves the server;
// callers reach these via the /api/places/* proxy routes. We request a tight
// field mask (cost + data minimization) and thread a session token so an
// autocomplete session + its follow-up details call bill as one session.

const PLACES_BASE = "https://places.googleapis.com/v1";

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "regularOpeningHours",
  "websiteUri",
  "googleMapsUri",
].join(",");

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return key;
}

export async function placesAutocomplete(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({ input, sessionToken, regionCode: "CA" }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Places autocomplete failed (${res.status})`);
  }

  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
        text?: { text?: string };
      };
    }>;
  };

  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId,
      primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
      full: p.text?.text ?? "",
    }));
}

export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails> {
  const url = new URL(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Place details failed (${res.status})`);
  }

  const p = (await res.json()) as {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    regularOpeningHours?: unknown;
    websiteUri?: string;
    googleMapsUri?: string;
  };

  return {
    googlePlaceId: p.id,
    name: p.displayName?.text ?? "",
    formattedAddress: p.formattedAddress ?? null,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    websiteUrl: p.websiteUri ?? null,
    googleMapsUri: p.googleMapsUri ?? null,
    openingHours: (p.regularOpeningHours as Json) ?? null,
  };
}
