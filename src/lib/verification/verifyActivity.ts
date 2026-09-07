export type VerificationStatus = "VERIFIED" | "REVIEW" | "REJECTED";

export interface VerificationActivity {
  type: string;
  source: string;
  distanceMeters: number;
  durationSeconds: number;
  gpsAvailable?: boolean;
  avgHeartRate?: number | null;
}

export interface VerificationResult {
  score: number;
  status: VerificationStatus;
}

/** Score an activity using GPS, heart rate, source, and average running speed. */
export function verifyActivity(activity: VerificationActivity): VerificationResult {
  let score = 100;

  if (!activity.gpsAvailable) score -= 20;
  if (activity.avgHeartRate == null) score -= 10;
  if (activity.source.toLowerCase() === "manual") score -= 25;

  const speedKmh = (activity.distanceMeters / activity.durationSeconds) * 3.6;
  if (activity.type.toLowerCase() === "running" && speedKmh > 25) {
    score -= 50;
  }

  score = Math.max(0, score);
  const status: VerificationStatus =
    score >= 80 ? "VERIFIED" : score >= 60 ? "REVIEW" : "REJECTED";

  return { score, status };
}
