import type { Json } from "@/types/database.types";

// Client- and server-shared shapes for Google Places results (kept out of the
// server-only places client so client components can import the types).
export type PlaceSuggestion = {
  placeId: string;
  primary: string; // business name
  secondary: string; // address line
  full: string;
};

export type PlaceDetails = {
  googlePlaceId: string | null; // null for a manually-added place (not on Google)
  name: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  websiteUrl: string | null;
  googleMapsUri: string | null;
  openingHours: Json | null; // raw regularOpeningHours (stored as jsonb)
};
