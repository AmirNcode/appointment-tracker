"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setHomeCity, clearHomeCity } from "@/actions/account";
import type { PlaceSuggestion, PlaceDetails } from "@/types/places";

export function HomeCity({ currentCity }: { currentCity: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!currentCity);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (!editing) return;
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/places/autocomplete?types=city&q=${encodeURIComponent(q)}&session=${sessionRef.current}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        // ignore transient autocomplete errors
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, editing]);

  async function choose(s: PlaceSuggestion) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(s.placeId)}&session=${sessionRef.current}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load that city.");
        return;
      }
      const d = data.details as PlaceDetails;
      if (d.latitude == null || d.longitude == null) {
        setError("That place has no location. Pick another.");
        return;
      }
      const label = [s.primary, s.secondary].filter(Boolean).join(", ");
      const result = await setHomeCity({
        label: label || d.name,
        lat: d.latitude,
        lng: d.longitude,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setQuery("");
      setSuggestions([]);
      sessionRef.current = crypto.randomUUID();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    await clearHomeCity();
    setSaving(false);
    setEditing(true);
    router.refresh();
  }

  if (!editing && currentCity) {
    return (
      <div className="card flex items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden>🏙️</span> {currentCity}
        </span>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-medium text-accent-strong"
          >
            Change
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="font-medium text-danger disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search your city…"
        className="input"
        autoFocus={!currentCity ? false : true}
      />
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {saving ? <p className="mt-2 text-sm text-muted">Saving…</p> : null}
      <ul className="mt-3 flex flex-col gap-2">
        {suggestions.map((s) => (
          <li key={s.placeId}>
            <button
              type="button"
              onClick={() => choose(s)}
              disabled={saving}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-left transition-colors hover:border-accent/40 disabled:opacity-50"
            >
              <span className="font-medium">{s.primary}</span>
              {s.secondary ? (
                <span className="text-sm text-muted"> · {s.secondary}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {currentCity ? (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setQuery("");
            setSuggestions([]);
          }}
          className="mt-3 text-sm text-muted underline underline-offset-4"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
