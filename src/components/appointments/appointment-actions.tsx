"use client";

import { cancelAppointment, completeAppointment } from "@/actions/appointments";

// Complete (roll forward) and cancel actions for an open appointment.
// Client component so the cancel can confirm before submitting.
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Mark as completed
        </h2>
        <p className="mt-1 text-sm text-muted">
          Already been? Log it (and the cost) to schedule your next visit. ✨
        </p>
        <form
          action={completeAppointment.bind(null, id)}
          className="card mt-3 flex flex-wrap items-end gap-3 p-4"
        >
          <label className="field-label w-32">
            Cost (optional)
            <input
              name="cost"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaultCost ?? undefined}
              placeholder="0.00"
              className="input"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            ✅ Mark completed
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
          className="text-sm font-medium text-danger underline underline-offset-4"
        >
          Cancel this appointment
        </button>
      </form>
    </div>
  );
}
