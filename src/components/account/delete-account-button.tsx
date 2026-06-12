"use client";

import { deleteAccount } from "@/actions/account";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete your account? This permanently removes all your spots, services, appointments, and reminders. This cannot be undone.",
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
        Delete my account
      </button>
    </form>
  );
}
