"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createGoogleMapsUrl, isValidLocation } from "@/domain/timeline/location";
import type { TimelineLocation } from "@/domain/timeline/types";

interface EventMapProps {
  locations: TimelineLocation[];
  title: string;
}

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function EventMap({ locations, title }: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const validLocations = useMemo(
    () => locations.filter(isValidLocation),
    [locations],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !validLocations.length) return;

    let cancelled = false;
    let resizeTimer: number | undefined;
    let map: import("leaflet").Map | null = null;
    setStatus("loading");

    async function renderMap() {
      try {
        const L = await import("leaflet");
        if (cancelled || !container) return;

        const first = validLocations[0];
        map = L.map(container, {
          attributionControl: true,
          center: [first.latitude, first.longitude],
          minZoom: 1,
          scrollWheelZoom: false,
          worldCopyJump: true,
          zoom: 3,
          zoomControl: true,
        });

        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);

        const markerIcon = L.divIcon({
          className: "event-map-marker",
          html: "<span></span>",
          iconAnchor: [10, 10],
          iconSize: [20, 20],
        });

        for (const location of validLocations) {
          if (location.precision === "approximate") {
            L.circle([location.latitude, location.longitude], {
              color: "#0f766e",
              fillColor: "#0f766e",
              fillOpacity: 0.12,
              opacity: 0.55,
              radius: 25_000,
              weight: 1,
            }).addTo(map);
          }

          const marker = L.marker([location.latitude, location.longitude], {
            icon: markerIcon,
            keyboard: true,
            riseOnHover: true,
            title: `${location.name} - Google 지도에서 보기`,
          }).addTo(map);
          const tooltip = document.createElement("span");
          tooltip.textContent = location.name;
          marker.bindTooltip(tooltip, { direction: "top", offset: [0, -8] });
          marker.on("click", () => {
            window.open(
              createGoogleMapsUrl(location),
              "_blank",
              "noopener,noreferrer",
            );
          });
        }

        if (validLocations.length > 1) {
          const bounds = L.latLngBounds(
            validLocations.map((location) => [
              location.latitude,
              location.longitude,
            ]),
          );
          map.fitBounds(bounds, { maxZoom: 3, padding: [24, 24] });
        }

        resizeTimer = window.setTimeout(() => map?.invalidateSize(), 0);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      map?.remove();
    };
  }, [validLocations]);

  if (!validLocations.length) return null;

  return (
    <div className="event-map-shell">
      <div
        aria-label={`${title} 발생 위치 지도`}
        className="event-map"
        ref={containerRef}
        role="region"
      />
      {status === "loading" ? (
        <span className="event-map-status">지도 불러오는 중</span>
      ) : null}
      {status === "error" ? (
        <span className="event-map-status event-map-error">
          지도를 불러오지 못했습니다
        </span>
      ) : null}
    </div>
  );
}
