"use client";

import { useState } from "react";
import { deleteService, updateService } from "@/actions/spots";

const inputCls =
  "rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40";

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
    <li className="rounded-lg border border-foreground/10">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span>
          <span className="font-medium">{service.name}</span>{" "}
          <span className="text-sm text-foreground/60">
            · {freqLabel(service.frequency_value, service.frequency_unit)}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-foreground/60 underline underline-offset-4"
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
            <button
              type="submit"
              className="text-red-600 underline underline-offset-4"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {editing ? (
        <div className="border-t border-foreground/10 p-3">
          <form
            action={updateService.bind(null, service.id, spotId)}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex grow flex-col gap-1 text-xs">
              Service
              <input
                name="name"
                type="text"
                required
                defaultValue={service.name}
                className={inputCls}
              />
            </label>
            <label className="flex w-16 flex-col gap-1 text-xs">
              Every
              <input
                name="frequencyValue"
                type="number"
                min={1}
                required
                defaultValue={service.frequency_value}
                className={inputCls}
              />
            </label>
            <label className="flex w-24 flex-col gap-1 text-xs">
              Unit
              <select
                name="frequencyUnit"
                defaultValue={service.frequency_unit}
                className={inputCls}
              >
                <option value="day">days</option>
                <option value="week">weeks</option>
                <option value="month">months</option>
              </select>
            </label>
            <label className="flex w-36 flex-col gap-1 text-xs">
              Last visit
              <input
                name="anchorDate"
                type="date"
                defaultValue={service.anchor_date ?? ""}
                className={inputCls}
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
            >
              Save
            </button>
          </form>
          <p className="mt-2 text-xs text-foreground/40">
            Setting a last-visit date recalculates when this is next due.
          </p>
        </div>
      ) : null}
    </li>
  );
}
