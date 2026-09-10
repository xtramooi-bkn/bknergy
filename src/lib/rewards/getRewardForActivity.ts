import "server-only";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { mapReward } from "./types";

export async function getRewardForActivity(activityId: string) {
  const { data, error } = await getRewardAdminClient().from("rewards")
    .select("*").eq("activity_id", activityId).maybeSingle();
  if (error) throw new Error("Reward storage is unavailable. Check server credentials and rewards SELECT permission.");
  return data ? mapReward(data) : null;
}
