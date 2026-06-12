"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import type { AuthState } from "@/lib/auth/types";
import { Brand } from "@/components/brand";

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Brand href="/" size="lg" />
        </div>
        <h1 className="font-display mt-8 text-center text-2xl font-semibold">
          Create your account ✨
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          Start keeping your beauty routine on track.
        </p>

        {state.message ? (
          <div className="card mt-8 p-4 text-sm" role="status">
            {state.message}
          </div>
        ) : (
          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <label className="field-label">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
              />
            </label>

            <label className="field-label">
              Password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="input"
              />
              <span className="text-xs text-muted">At least 8 characters.</span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailReminders"
                className="mt-0.5 h-5 w-5 accent-[var(--accent)]"
              />
              <span className="text-muted">
                Email me reminders when an appointment is due. You can
                unsubscribe anytime. 💌
              </span>
            </label>

            {state.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary mt-2 w-full"
            >
              {pending ? "Creating account…" : "Create account"}
            </button>

            <p className="text-xs text-muted">
              By creating an account you agree to our{" "}
              <Link
                href="/terms"
                className="text-accent-strong underline underline-offset-4"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-accent-strong underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-accent-strong underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
