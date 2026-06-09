import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placesAutocomplete } from "@/lib/google/places";

// T3.1 — Autocomplete proxy. Auth-gated so it can't be used as an open proxy
// that burns our Places quota. The API key stays server-side.
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

  // Avoid spending a call on very short inputs.
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await placesAutocomplete(q, sessionToken);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Places error" },
      { status: 502 },
    );
  }
}
