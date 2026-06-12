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

type Circle = { lat: number; lng: number; radiusMeters: number };

export type AutocompleteOptions = {
  // Soft-bias results toward a circle. Only nudges ranking — does NOT exclude
  // far-away matches, so a query with no local hit still returns global noise.
  bias?: Circle;
  // Hard-restrict results to a circle (center + radius in metres). Anything
  // outside is dropped. The radius is sized to cover the whole metro, so a spot
  // in a neighbouring municipality (Richmond Hill/Markham vs Toronto) is still
  // included, while results in other cities/countries are excluded.
  restrict?: Circle;
  // Restrict suggestions to these primary types (e.g. ["locality"] for cities).
  includedPrimaryTypes?: string[];
};

export async function placesAutocomplete(
  input: string,
  sessionToken: string,
  opts: AutocompleteOptions = {},
): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = {
    input,
    sessionToken,
    regionCode: "CA",
  };
  // locationBias and locationRestriction are mutually exclusive — restriction
  // wins if both are somehow provided.
  if (opts.restrict) {
    body.locationRestriction = {
      circle: {
        center: { latitude: opts.restrict.lat, longitude: opts.restrict.lng },
        radius: opts.restrict.radiusMeters,
      },
    };
  } else if (opts.bias) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.bias.lat, longitude: opts.bias.lng },
        radius: opts.bias.radiusMeters,
      },
    };
  }
  if (opts.includedPrimaryTypes?.length) {
    body.includedPrimaryTypes = opts.includedPrimaryTypes;
  }

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify(body),
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
