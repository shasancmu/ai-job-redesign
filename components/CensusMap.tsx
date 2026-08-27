"use client";

import { useEffect, useRef, useState } from "react";
import { WORLD_PATH } from "@/lib/worldPath";
import { project } from "@/lib/census";

type Point = { lat: number; lng: number; name?: string; label?: string };

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Load Leaflet from a CDN once (no npm dependency needed).
function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.L) return resolve(w.L);
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = LEAFLET_CSS; link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    const existing = document.querySelector("script[data-leaflet]") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve(w.L)); existing.addEventListener("error", () => reject(new Error("leaflet"))); return; }
    const s = document.createElement("script");
    s.src = LEAFLET_JS; s.async = true; s.setAttribute("data-leaflet", "1");
    s.onload = () => resolve(w.L);
    s.onerror = () => reject(new Error("leaflet"));
    document.head.appendChild(s);
  });
}

function esc(s: string) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)); }

// An interactive world map (Leaflet + OpenStreetMap tiles) of the geocoded firms.
export default function CensusMap({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current || mapRef.current || !L) return;
      const map = L.map(ref.current, { scrollWheelZoom: true, worldCopyJump: true, minZoom: 1 });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      const pts = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (pts.length) {
        const markers = pts.map((p) =>
          L.circleMarker([p.lat, p.lng], { radius: 7, color: "#ffffff", weight: 2, fillColor: "#3F7A52", fillOpacity: 0.95 })
            .bindPopup(`<b>${esc(p.name || "Business")}</b>${p.label ? `<br><span style="color:#64748b">${esc(p.label)}</span>` : ""}`)
        );
        const group = L.featureGroup(markers).addTo(map);
        try { map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 13 }); } catch { map.setView([20, 0], 2); }
      } else {
        map.setView([20, 0], 2);
      }
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 150);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; } };
  }, [points]);

  // Fallback when Leaflet can't load: the self-contained static world map.
  if (failed) {
    const pts = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    return (
      <div className="overflow-hidden rounded-xl border border-line">
        <svg viewBox="0 0 360 180" className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
          <rect x={0} y={0} width={360} height={180} fill="#eaf1f4" />
          <path d={WORLD_PATH} fill="#d6ddd2" stroke="#c2cbbd" strokeWidth={0.15} />
          {pts.map((p, i) => { const pr = project(p.lat, p.lng); return <circle key={i} cx={pr.x * 360} cy={pr.y * 180} r={2.4} fill="#3F7A52" stroke="#fff" strokeWidth={0.6} />; })}
        </svg>
      </div>
    );
  }
  return <div ref={ref} className="w-full rounded-xl border border-line" style={{ height: 420 }} />;
}
