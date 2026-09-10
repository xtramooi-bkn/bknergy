"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createRewardForActivity } from "@/src/lib/rewards/createRewardForActivity";

export async function requestActivityReward(_previous: { error: string }, formData: FormData) {
  // Temporary boundary for the existing single-user local app.
  // Replace with authenticated activity ownership checks before enabling production writes.
  const host = (await headers()).get("host") ?? "";
  if (process.env.NODE_ENV !== "development" || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
    return { error: "Reward creation is available only in local development until account authentication is connected." };
  }
  const keys = [...formData.keys()].filter(key => !key.startsWith("$ACTION_"));
  const activityId = formData.get("activityId");
  if (keys.length !== 1 || keys[0] !== "activityId" || typeof activityId !== "string") {
    return { error: "Send only an activity ID." };
  }
  try {
    await createRewardForActivity(activityId);
    revalidatePath(`/activities/${activityId}`);
    revalidatePath("/activities");
    revalidatePath("/");
    return { error: "" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create reward. Please try again." };
  }
}
