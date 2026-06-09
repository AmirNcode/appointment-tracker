import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placeDetails } from "@/lib/google/places";

// T3.2 — Place Details proxy (field-masked). Auth-gated; key stays server-side.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const sessionToken = searchParams.get("session") ?? "";

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  try {
    const details = await placeDetails(placeId, sessionToken);
    return NextResponse.json({ details });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Places error" },
      { status: 502 },
    );
  }
}
