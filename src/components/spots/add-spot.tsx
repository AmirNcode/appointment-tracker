"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSpot } from "@/actions/spots";
import type { PlaceSuggestion, PlaceDetails } from "@/types/places";

type ServiceRow = {
  name: string;
  frequencyValue: string;
  frequencyUnit: "day" | "week" | "month";
  anchorDate: string;
};

const emptyService: ServiceRow = {
  name: "",
  frequencyValue: "5",
  frequencyUnit: "week",
  anchorDate: "",
};

const inputCls =
  "rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40";

export function AddSpot() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selected, setSelected] = useState<PlaceDetails | null>(null);
  const [bookingMethod, setBookingMethod] = useState<
    "phone" | "website" | "other"
  >("phone");
  const [bookingUrl, setBookingUrl] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([{ ...emptyService }]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const sessionRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(q)}&session=${sessionRef.current}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        // ignore transient autocomplete errors
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  async function pick(placeId: string) {
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(placeId)}&session=${sessionRef.current}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load that place.");
        return;
      }
      const details = data.details as PlaceDetails;
      setSelected(details);
      setSuggestions([]);
      setBookingUrl(details.websiteUrl ?? "");
      setBookingMethod(details.websiteUrl ? "website" : "phone");
    } finally {
      setLoadingDetails(false);
    }
  }

  function reset() {
    setSelected(null);
    setManual(false);
    setQuery("");
    setSuggestions([]);
    setServices([{ ...emptyService }]);
    setBookingMethod("phone");
    setBookingUrl("");
    setError(null);
    sessionRef.current = crypto.randomUUID();
  }

  // Start a manual entry for a place that isn't on Google Maps. Reuses the
  // configure/save step, but with editable place fields instead of read-only.
  function startManual() {
    setSelected({
      googlePlaceId: null,
      name: query.trim(),
      formattedAddress: null,
      latitude: null,
      longitude: null,
      phone: null,
      websiteUrl: null,
      googleMapsUri: null,
      openingHours: null,
    });
    setManual(true);
    setSuggestions([]);
    setBookingMethod("phone");
    setBookingUrl("");
    setError(null);
  }

  function patchSelected(patch: Partial<PlaceDetails>) {
    setSelected((s) => (s ? { ...s, ...patch } : s));
  }

  function updateService(i: number, patch: Partial<ServiceRow>) {
    setServices((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!selected) return;
    if (!selected.name.trim()) {
      setError("Enter a business name.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createSpot({
      place: selected,
      bookingMethod,
      bookingUrl: bookingMethod === "website" ? bookingUrl.trim() || null : null,
      services: services
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          frequencyValue: Number(s.frequencyValue),
          frequencyUnit: s.frequencyUnit,
          anchorDate: s.anchorDate || null,
        })),
    });
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/spots/${result.spotId}`);
  }

  // --- Search step ---------------------------------------------------------
  if (!selected) {
    return (
      <div className="mt-6">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a business by name…"
          className={`${inputCls} w-full`}
        />
        {loadingDetails ? (
          <p className="mt-3 text-sm text-foreground/60">Loading…</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <ul className="mt-3 flex flex-col gap-1">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s.placeId)}
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-left hover:border-foreground/30"
              >
                <div className="font-medium">{s.primary}</div>
                {s.secondary ? (
                  <div className="text-sm text-foreground/60">{s.secondary}</div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {query.trim().length > 0 && query.trim().length < 3 ? (
          <p className="mt-2 text-xs text-foreground/40">Keep typing…</p>
        ) : null}
        <button
          type="button"
          onClick={startManual}
          className="mt-4 text-sm font-medium text-foreground underline underline-offset-4"
        >
          Can&apos;t find it? Add a place manually
        </button>
      </div>
    );
  }

  // --- Configure & save step ----------------------------------------------
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-lg border border-foreground/15 p-4">
        {manual ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Add a place manually</h2>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 text-sm text-foreground/60 underline underline-offset-4"
              >
                Cancel
              </button>
            </div>
            <label className="flex flex-col gap-1 text-xs">
              Business name
              <input
                type="text"
                autoFocus
                value={selected.name}
                onChange={(e) => patchSelected({ name: e.target.value })}
                placeholder="e.g. Jane's home studio"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Address (optional)
              <input
                type="text"
                value={selected.formattedAddress ?? ""}
                onChange={(e) =>
                  patchSelected({ formattedAddress: e.target.value || null })
                }
                placeholder="Street, city"
                className={inputCls}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <label className="flex grow flex-col gap-1 text-xs">
                Phone (optional)
                <input
                  type="tel"
                  value={selected.phone ?? ""}
                  onChange={(e) =>
                    patchSelected({ phone: e.target.value || null })
                  }
                  placeholder="(555) 123-4567"
                  className={inputCls}
                />
              </label>
              <label className="flex grow flex-col gap-1 text-xs">
                Website (optional)
                <input
                  type="url"
                  value={selected.websiteUrl ?? ""}
                  onChange={(e) =>
                    patchSelected({ websiteUrl: e.target.value || null })
                  }
                  placeholder="https://…"
                  className={inputCls}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{selected.name}</div>
              {selected.formattedAddress ? (
                <div className="mt-0.5 text-sm text-foreground/60">
                  {selected.formattedAddress}
                </div>
              ) : null}
              {selected.phone ? (
                <div className="mt-0.5 text-sm text-foreground/60">
                  {selected.phone}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-sm text-foreground/60 underline underline-offset-4"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Services */}
      <div>
        <h2 className="text-sm font-semibold">Services you get here</h2>
        <div className="mt-3 flex flex-col gap-3">
          {services.map((s, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-foreground/10 p-3"
            >
              <label className="flex grow flex-col gap-1 text-xs">
                Service
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateService(i, { name: e.target.value })}
                  placeholder="e.g. Pedicure"
                  className={inputCls}
                />
              </label>
              <label className="flex w-16 flex-col gap-1 text-xs">
                Every
                <input
                  type="number"
                  min={1}
                  value={s.frequencyValue}
                  onChange={(e) =>
                    updateService(i, { frequencyValue: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
              <label className="flex w-24 flex-col gap-1 text-xs">
                Unit
                <select
                  value={s.frequencyUnit}
                  onChange={(e) =>
                    updateService(i, {
                      frequencyUnit: e.target.value as ServiceRow["frequencyUnit"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="day">days</option>
                  <option value="week">weeks</option>
                  <option value="month">months</option>
                </select>
              </label>
              <label className="flex w-36 flex-col gap-1 text-xs">
                Last visit (optional)
                <input
                  type="date"
                  value={s.anchorDate}
                  onChange={(e) => updateService(i, { anchorDate: e.target.value })}
                  className={inputCls}
                />
              </label>
              {services.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setServices((rows) => rows.filter((_, idx) => idx !== i))
                  }
                  className="pb-2 text-sm text-foreground/50 underline underline-offset-4"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setServices((rows) => [...rows, { ...emptyService }])}
          className="mt-2 text-sm font-medium text-foreground underline underline-offset-4"
        >
          + Add another service
        </button>
      </div>

      {/* Booking method */}
      <div>
        <h2 className="text-sm font-semibold">How do you book?</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {(["phone", "website", "other"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input
                type="radio"
                name="bookingMethod"
                checked={bookingMethod === m}
                onChange={() => setBookingMethod(m)}
              />
              {m === "phone"
                ? `Phone${selected.phone ? ` (${selected.phone})` : ""}`
                : m === "website"
                  ? "Website / booking link"
                  : "Other"}
            </label>
          ))}
          {bookingMethod === "website" ? (
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="https://…"
              className={`${inputCls} mt-1`}
            />
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !selected.name.trim()}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save spot"}
        </button>
      </div>
    </div>
  );
}
