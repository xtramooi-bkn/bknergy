type Activity = {
  type: string;
  distanceMeters?: number;
  durationSeconds?: number;
};

export function calculateReward(
  activity: Activity,
  verificationScore: number
) {
  if (verificationScore < 80) {
    return 0;
  }

  const distanceKm = (activity.distanceMeters ?? 0) / 1000;
  const durationMinutes = (activity.durationSeconds ?? 0) / 60;

  switch (activity.type) {
    case "running":
      return Math.floor(distanceKm * 10);

    case "walking":
      return Math.floor(distanceKm * 2);

    case "cycling":
      return Math.floor(distanceKm * 1);

    case "workout":
      return Math.floor(durationMinutes / 30) * 25;

    default:
      return 0;
  }
}