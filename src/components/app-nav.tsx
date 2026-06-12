"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", emoji: "🏠" },
  { href: "/spots", label: "Spots", emoji: "📍" },
  { href: "/spend", label: "Spend", emoji: "💸" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
];

// Fixed bottom tab bar — the primary navigation in the standalone PWA.
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md">
      <ul className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-2">
        {tabs.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 px-2 pb-1.5 pt-2.5"
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full text-lg transition-colors ${
                    active ? "bg-accent-soft" : ""
                  }`}
                >
                  {t.emoji}
                </span>
                <span
                  className={`text-[0.7rem] font-medium ${
                    active ? "text-accent-strong" : "text-muted"
                  }`}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
