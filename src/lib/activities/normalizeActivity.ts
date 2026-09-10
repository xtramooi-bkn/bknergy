import { normalizeRoutePoints, type RoutePoint } from "./routePoints";

export const activitySources = ["demo", "garmin", "strava", "apple_health", "health_connect", "manual"] as const;
export type ActivitySource = typeof activitySources[number];
export const sourceLabels: Record<ActivitySource, string> = { demo: "Demo activity", garmin: "Garmin", strava: "Strava", apple_health: "Apple Health", health_connect: "Health Connect", manual: "Manual entry" };

/** Provider adapters supply common units; source identity never implies a live connection. */
export interface ActivityInput {
  id: string;
  name: string;
  type: string;
  source: ActivitySource;
  campaignId?: string | null;
  user?: string;
  originalSource?: string | null;
  isDemo?: boolean;
  isManual?: boolean;
  distanceMeters: number;
  durationSeconds: number;
  steps?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  gpsAvailable?: boolean;
  routePoints?: unknown;
}
export interface NormalizedActivity extends Omit<ActivityInput, "routePoints" | "steps" | "maxHeartRate"> {
  campaignId: string | null;
  user: string;
  originalSource: string | null;
  isDemo: boolean;
  isManual: boolean;
  steps?: number;
  maxHeartRate?: number;
  routePoints: RoutePoint[];
}
export function normalizeActivity(input: ActivityInput): NormalizedActivity {
  if (!activitySources.includes(input.source)) throw new Error("Unsupported activity source.");
  for (const value of [input.distanceMeters, input.durationSeconds, input.steps, input.avgHeartRate, input.maxHeartRate]) {
    if (value != null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new Error("Invalid activity measurement.");
  }
  if (input.distanceMeters == null || input.durationSeconds == null) throw new Error("Missing activity measurements.");
  const isDemo = input.source === "demo" || input.isDemo === true;
  return { ...input, type: input.type.toLowerCase(), source: isDemo ? "demo" : input.source,
    campaignId: input.campaignId ?? null, user: input.user ?? "", isDemo,
    originalSource: input.originalSource ?? (isDemo && input.source !== "demo" ? `${sourceLabels[input.source]}-style activity` : null),
    isManual: input.isManual === true || input.source === "manual",
    steps: input.steps ?? undefined, maxHeartRate: input.maxHeartRate ?? undefined,
    routePoints: normalizeRoutePoints(input.routePoints) };
}
