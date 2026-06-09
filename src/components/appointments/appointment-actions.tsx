"use client";

import { cancelAppointment, completeAppointment } from "@/actions/appointments";

const inputCls =
  "rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40";

// T5.3 (complete → roll forward) and T5.4 (cancel) actions for an open
// appointment. Client component so the cancel can confirm before submitting.
export function AppointmentActions({
  id,
  defaultCost,
}: {
  id: string;
  defaultCost: number | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold">Mark as completed</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Already been? Log it (and the cost) to schedule the next visit.
        </p>
        <form
          action={completeAppointment.bind(null, id)}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <label className="flex w-28 flex-col gap-1 text-xs">
            Cost (optional)
            <input
              name="cost"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaultCost ?? undefined}
              placeholder="0.00"
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Mark completed
          </button>
        </form>
      </div>

      <form
        action={cancelAppointment.bind(null, id)}
        onSubmit={(e) => {
          if (
            !confirm(
              "Cancel this appointment? Its reminders stop and the next visit won't be scheduled.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="text-sm text-red-600 underline underline-offset-4"
        >
          Cancel this appointment
        </button>
      </form>
    </div>
  );
}
