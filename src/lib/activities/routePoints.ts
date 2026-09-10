export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export type RoutePointInput = RoutePoint | { lat: number; lng: number };

/** Normalize provider coordinates without accepting malformed or out-of-range points. */
export function normalizeRoutePoints(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point: unknown) => {
    if (!point || typeof point !== "object") return [];
    const record = point as Record<string, unknown>;
    const latitude = record.latitude ?? record.lat;
    const longitude = record.longitude ?? record.lng;
    if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return [];
    return [{ latitude, longitude }];
  });
}
