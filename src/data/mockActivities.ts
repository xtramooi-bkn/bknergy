import { normalizeActivity, type ActivityInput, type NormalizedActivity } from "@/src/lib/activities/normalizeActivity";

export type MockActivity = NormalizedActivity;

const runningRoute = [
  [52.36, 4.865], [52.361, 4.868], [52.363, 4.870], [52.364, 4.874],
  [52.365, 4.878], [52.364, 4.882], [52.362, 4.885], [52.360, 4.887],
  [52.358, 4.884], [52.357, 4.880], [52.356, 4.876], [52.357, 4.872],
  [52.358, 4.869], [52.359, 4.867],
].map(([latitude, longitude]) => ({ latitude, longitude }));
const walkingRoute = [
  [52.36, 4.87], [52.361, 4.872], [52.362, 4.875], [52.361, 4.878],
  [52.359, 4.879], [52.358, 4.876], [52.358, 4.873], [52.359, 4.871],
].map(([latitude, longitude]) => ({ latitude, longitude }));

const inputs: ActivityInput[] = [
  { id: "run-001", name: "Morning Run", user: "Johan", type: "running", source: "demo", isDemo: true, originalSource: "Garmin-style activity", distanceMeters: 5240, durationSeconds: 1902, steps: 5842, avgHeartRate: 154, maxHeartRate: 176, gpsAvailable: true, routePoints: runningRoute },
  { id: "walk-002", name: "Evening Walk", user: "Johan", type: "walking", source: "demo", isDemo: true, originalSource: "Garmin-style activity", distanceMeters: 3800, durationSeconds: 2640, steps: 4912, avgHeartRate: 101, gpsAvailable: true, routePoints: walkingRoute },
  { id: "run-003", name: "Manual Run", user: "Johan", type: "running", source: "demo", isDemo: true, isManual: true, originalSource: "Manual-entry activity", distanceMeters: 20000, durationSeconds: 1800, gpsAvailable: false, routePoints: [] },
];

export const mockActivities = inputs.map(normalizeActivity);
// Preserve the existing dashboard import for the latest activity.
export const mockActivity = mockActivities[0];
