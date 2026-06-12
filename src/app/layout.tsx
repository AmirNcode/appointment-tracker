import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Soft display serif for the wordmark + headings — gives the elegant beauty feel.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Lumi — your beauty routine, on schedule",
    template: "%s · Lumi",
  },
  description:
    "Save the spots you love, set how often you go, and Lumi nudges you before you're due — then adds it to your calendar in one tap. 💅",
  applicationName: "Lumi",
  appleWebApp: {
    capable: true,
    title: "Lumi",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
