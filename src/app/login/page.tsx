"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/actions/auth";
import type { AuthState } from "@/lib/auth/types";
import { Brand } from "@/components/brand";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Brand href="/" size="lg" />
        </div>
        <h1 className="font-display mt-8 text-center text-2xl font-semibold">
          Welcome back 💖
        </h1>

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
              autoComplete="current-password"
              required
              className="input"
            />
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
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-accent-strong underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
