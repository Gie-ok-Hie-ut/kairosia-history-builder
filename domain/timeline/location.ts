import type { TimelineLocation } from "./types";

export function createGoogleMapsUrl(location: TimelineLocation): string {
  const query = `${location.latitude},${location.longitude}`;
  const parameters = new URLSearchParams({ api: "1", query });
  return `https://www.google.com/maps/search/?${parameters.toString()}`;
}

export function isValidLocation(location: TimelineLocation): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}
