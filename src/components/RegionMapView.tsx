"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { NearbySchool } from "@/lib/schools";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Mapbox GL map for a coverage-tier region (any of the 334 SoCal places).
 * Lighter than MapView: a center pin plus nearby-school markers, since
 * amenities/permits ingestion is pilot-area-only. Degrades to a static
 * placeholder when NEXT_PUBLIC_MAPBOX_TOKEN is missing.
 */
export function RegionMapView({
  name,
  lat,
  lng,
  schools,
}: {
  name: string;
  lat: number;
  lng: number;
  schools: NearbySchool[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let map: import("mapbox-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [lng, lat],
          zoom: 12,
        });
      } catch {
        setError("Map failed to initialize — check your Mapbox token.");
        return;
      }
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      new mapboxgl.Marker({ color: "#0f6b5c" })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<b>${name}</b>`))
        .addTo(map);

      for (const s of schools) {
        new mapboxgl.Marker({ color: "#2b5fb8", scale: 0.75 })
          .setLngLat([s.lng, s.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<b>${s.name}</b><br>${s.district}`))
          .addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [name, lat, lng, schools]);

  if (!TOKEN) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-line bg-brand-light p-8 text-center">
        <p className="font-semibold text-brand">Map placeholder</p>
        <p className="mt-2 max-w-sm text-sm text-ink-2">
          Add <code className="rounded bg-white px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
          <code className="rounded bg-white px-1">.env.local</code> for the interactive map.
          Centered on {name} ({lat.toFixed(4)}, {lng.toFixed(4)}).
        </p>
        {schools.length > 0 && (
          <ul className="mt-4 space-y-1 text-left text-xs text-ink-2">
            {schools.slice(0, 8).map((s) => (
              <li key={s.cdsCode}>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#2b5fb8]" />
                {s.name} ({s.distanceMiles} mi)
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-line bg-canvas p-8 text-sm text-ink-2">
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[420px] w-full rounded-xl" />;
}
