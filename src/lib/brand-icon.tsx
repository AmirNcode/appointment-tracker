import type { ReactElement } from "react";

// Shared app-icon mark for ImageResponse-generated PNGs (favicon/apple/maskable).
// A 💅 emoji centered on Lumi's lavender gradient. ImageResponse renders the
// emoji via Twemoji (its default `emoji` option), so no font file is needed.
export function brandIcon(size: number): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)",
        fontSize: Math.round(size * 0.56),
        lineHeight: 1,
      }}
    >
      💅
    </div>
  );
}
