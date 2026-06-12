import type { MetadataRoute } from "next";

// PWA manifest. Next auto-links this at <link rel="manifest">.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumi — beauty routine scheduler",
    short_name: "Lumi",
    description:
      "Save the spots you love, set how often you go, and get a gentle nudge before you're due. 💅",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8ff",
    theme_color: "#faf8ff",
    categories: ["lifestyle", "health", "productivity"],
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
