"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import type { AuthState } from "@/lib/auth/types";

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Start tracking your appointments.
        </p>

        {state.message ? (
          <div
            className="mt-6 rounded-lg border border-foreground/15 bg-foreground/5 p-4 text-sm"
            role="status"
          >
            {state.message}
          </div>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40"
              />
              <span className="text-xs text-foreground/50">
                At least 8 characters.
              </span>
            </label>

            {state.error ? (
              <p className="text-sm text-red-600" role="alert">
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/60">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
