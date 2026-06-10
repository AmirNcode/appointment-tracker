import type { MetadataRoute } from "next";

// T9.1 — PWA manifest. Next auto-links this at <link rel="manifest">.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beauty Scheduler",
    short_name: "Beauty",
    description:
      "Track the beauty appointments you get, where, and how often — and get reminded before you're due.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
