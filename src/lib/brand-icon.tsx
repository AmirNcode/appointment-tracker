import type { ReactElement } from "react";

// Shared app-icon mark for ImageResponse-generated PNGs (favicon/apple/maskable).
// Font-free (a ring on a dark field) so it renders without loading a typeface.
export function brandIcon(size: number): ReactElement {
  const ring = Math.max(4, Math.round(size * 0.08));
  const inner = Math.round(size * 0.5);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
      }}
    >
      <div
        style={{
          width: `${inner}px`,
          height: `${inner}px`,
          borderRadius: "9999px",
          border: `${ring}px solid #ffffff`,
        }}
      />
    </div>
  );
}
