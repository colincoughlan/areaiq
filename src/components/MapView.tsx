"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Area } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/areas";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const KIND_COLOR: Record<string, string> = {
  school: "#2b5fb8",
  amenity: "#1a7f4e",
  project: "#c8862a",
  transit: "#6b46c1",
  property: "#0f6b5c",
};

/**
 * Mapbox GL map for an area. Degrades to a static placeholder when
 * NEXT_PUBLIC_MAPBOX_TOKEN is missing so the app runs with zero setup.
 */
export function MapView({ area }: { area: Area }) {
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
          center: [area.lng, area.lat],
          zoom: area.zoom,
        });
      } catch {
        setError("Map failed to initialize — check your Mapbox token.");
        return;
      }
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      new mapboxgl.Marker({ color: KIND_COLOR.property })
        .setLngLat([area.lng, area.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<b>${area.sampleAddress}</b>`))
        .addTo(map);

      for (const p of area.mapPoints) {
        new mapboxgl.Marker({ color: KIND_COLOR[p.kind], scale: 0.75 })
          .setLngLat([p.lng, p.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<b>${p.label}</b>`))
          .addTo(map);
      }
      for (const proj of area.projects) {
        new mapboxgl.Marker({ color: KIND_COLOR.project, scale: 0.85 })
          .setLngLat([proj.lng, proj.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<b>${proj.name}</b><br>${STATUS_LABEL[proj.status]} · ${proj.size}`
            )
          )
          .addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [area]);

  if (!TOKEN) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-line bg-brand-light p-8 text-center">
        <p className="font-semibold text-brand">Map placeholder</p>
        <p className="mt-2 max-w-sm text-sm text-ink-2">
          Add <code className="rounded bg-white px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
          <code className="rounded bg-white px-1">.env.local</code> for the interactive map.
          Centered on {area.name} ({area.lat.toFixed(4)}, {area.lng.toFixed(4)}).
        </p>
        <ul className="mt-4 space-y-1 text-left text-xs text-ink-2">
          {area.mapPoints.map((p) => (
            <li key={p.label}>
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: KIND_COLOR[p.kind] }}
              />
              {p.label}
            </li>
          ))}
        </ul>
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
