"use client";

import { useState } from "react";
import { deleteService, updateService } from "@/actions/spots";

type Service = {
  id: string;
  name: string;
  frequency_value: number;
  frequency_unit: string;
  anchor_date: string | null;
};

function freqLabel(value: number, unit: string) {
  return `every ${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function ServiceItem({
  service,
  spotId,
}: {
  service: Service;
  spotId: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {/* Whole row taps open the editor (Edit button kept too). */}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex grow items-center gap-2 text-left"
        >
          <span className="font-medium">{service.name}</span>
          <span className="text-sm text-muted">
            · {freqLabel(service.frequency_value, service.frequency_unit)}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-medium text-accent-strong"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <form
            action={deleteService.bind(null, service.id, spotId)}
            onSubmit={(e) => {
              if (
                !confirm(
                  `Remove "${service.name}"? This also deletes its appointments and reminders.`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <button type="submit" className="font-medium text-danger">
              Delete
            </button>
          </form>
        </div>
      </div>

      {editing ? (
        <div className="border-t border-border bg-surface-soft p-4">
          <form
            action={updateService.bind(null, service.id, spotId)}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="field-label grow">
              Service
              <input
                name="name"
                type="text"
                required
                defaultValue={service.name}
                className="input"
              />
            </label>
            <label className="field-label w-20">
              Every
              <input
                name="frequencyValue"
                type="number"
                min={1}
                required
                defaultValue={service.frequency_value}
                className="input"
              />
            </label>
            <label className="field-label w-28">
              Unit
              <select
                name="frequencyUnit"
                defaultValue={service.frequency_unit}
                className="input"
              >
                <option value="day">days</option>
                <option value="week">weeks</option>
                <option value="month">months</option>
              </select>
            </label>
            <label className="field-label w-40">
              Last visit
              <input
                name="anchorDate"
                type="date"
                defaultValue={service.anchor_date ?? ""}
                className="input"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Setting a last-visit date recalculates when this is next due.
          </p>
        </div>
      ) : null}
    </li>
  );
}
