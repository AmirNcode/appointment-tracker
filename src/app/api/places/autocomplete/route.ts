import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placesAutocomplete, type AutocompleteOptions } from "@/lib/google/places";

// Radius of the search fence around the user's home city. 50 km (the API max
// for a circle) covers a whole metro — e.g. from downtown Toronto it reaches
// Richmond Hill, Markham, Mississauga, Brampton, Oakville — so neighbouring
// municipalities are included while other cities/countries are excluded. Spots
// farther out can still be added with "Add a place manually".
const HOME_RADIUS_M = 50_000;

// Autocomplete proxy. Auth-gated so it can't be used as an open proxy that
// burns our Places quota. The API key stays server-side.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sessionToken = searchParams.get("session") ?? "";
  const cityMode = searchParams.get("types") === "city";

  // Avoid spending a call on very short inputs.
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const opts: AutocompleteOptions = {};

  if (cityMode) {
    // City picker: only return localities (cities/towns).
    opts.includedPrimaryTypes = ["locality"];
  } else {
    // Business search: restrict to a circle around the user's saved home city,
    // if set, so results stay local instead of returning global matches.
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_lat, home_lng")
      .eq("id", user.id)
      .single();
    if (profile?.home_lat != null && profile?.home_lng != null) {
      opts.restrict = {
        lat: profile.home_lat,
        lng: profile.home_lng,
        radiusMeters: HOME_RADIUS_M,
      };
    }
  }

  try {
    const suggestions = await placesAutocomplete(q, sessionToken, opts);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Places error" },
      { status: 502 },
    );
  }
}
