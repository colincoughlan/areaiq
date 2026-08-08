import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "AreaIQ — Know the neighborhood before you buy",
  description:
    "Search a Southern California address and get a simple, source-backed neighborhood intelligence report.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AreaIQ" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a4a40",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-white px-5 py-2.5">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-brand">
            Area<span className="text-gold">IQ</span>
          </Link>
          <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Phase 1 · Sample data
          </span>
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold text-ink-2">
            <Link href="/compare" className="rounded-md px-3 py-1.5 hover:bg-canvas">
              Compare
            </Link>
            <Link href="/methodology" className="rounded-md px-3 py-1.5 hover:bg-canvas">
              Methodology
            </Link>
            <Link href="/business" className="rounded-md px-3 py-1.5 text-brand hover:bg-brand-light">
              For businesses
            </Link>
          </nav>
        </header>
        {children}
        <footer className="border-t border-line bg-white px-5 py-6 text-xs text-ink-3">
          All neighborhood figures are illustrative sample data (Phase 1). AreaIQ never uses
          protected characteristics to score or recommend areas.{" "}
          <a className="underline" href="mailto:corrections@areaiq.example">
            Report an error
          </a>
        </footer>
      </body>
    </html>
  );
}
