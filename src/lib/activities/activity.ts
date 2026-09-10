import { normalizeActivity, activitySources, type ActivitySource, type NormalizedActivity } from "./normalizeActivity";
export type Activity = NormalizedActivity;

/** Supabase adapter. Legacy MVP rows are simulated unless explicitly marked otherwise. */
export function mapActivity(row: Record<string, unknown>): Activity {
  if (typeof row.id !== "string" || typeof row.type !== "string" || typeof row.source !== "string") throw new Error("Activity is missing its id, type, or source.");
  const source = row.source.toLowerCase().replace(/[ -]/g, "_");
  if (!activitySources.includes(source as ActivitySource)) throw new Error("Unsupported stored activity source.");
  const number = (key: string) => {
    if (typeof row[key] !== "number" || !Number.isFinite(row[key]) || row[key] < 0) throw new Error(`Invalid activity field: ${key}`);
    return row[key] as number;
  };
  const optional = (key: string) => row[key] == null ? undefined : number(key);
  return normalizeActivity({ id: row.id, name: typeof row.name === "string" ? row.name : "Untitled activity",
    user: typeof row.user === "string" ? row.user : "", type: row.type, source: source as ActivitySource,
    campaignId: typeof row.campaign_id === "string" ? row.campaign_id : null,
    originalSource: typeof row.original_source === "string" ? row.original_source : null,
    isDemo: row.is_demo !== false, isManual: row.is_manual === true || source === "manual",
    distanceMeters: number("distance_meters"), durationSeconds: number("duration_seconds"),
    avgHeartRate: optional("avg_heart_rate"), maxHeartRate: optional("max_heart_rate"), steps: optional("steps"),
    gpsAvailable: row.gps_available === true, routePoints: row.route_points });
}
