import "server-only";
import { mapActivity } from "@/src/lib/activities/activity";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { verifyActivity } from "@/src/lib/verification/verifyActivity";
import { getActivityRewardContext } from "@/src/lib/campaigns/queries";
import { getRewardForActivity } from "./getRewardForActivity";
import { mapReward, type RewardRecord } from "./types";

/** Trusted server entry point. The action enforces the local single-user boundary. */
export async function createRewardForActivity(activityId: string): Promise<RewardRecord> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId)) throw new Error("Invalid activity ID.");
  const db = getRewardAdminClient();
  const { data, error } = await db.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (error) throw new Error("Unable to load the activity. Check server-side activities SELECT permission.");
  if (!data) throw new Error("Activity not found.");
  const activity = mapActivity(data);
  const verification = verifyActivity(activity);
  if (verification.score < 80) throw new Error("This activity is not verified and cannot earn a reward.");
  const existing = await getRewardForActivity(activityId);
  if (existing) return existing;
  const context = await getActivityRewardContext(activity, verification.score);
  if (context.reason || !context.rule || !context.campaign) throw new Error(context.reason ?? "No matching campaign rule.");
  const amount = context.amount;
  if (amount <= 0) throw new Error("This activity has no payable reward under the campaign rule.");
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid calculated reward.");
  // Preview is advisory. The RPC locks rows and recalculates from current DB data.
  // There is deliberately no direct-insert fallback if the RPC is unavailable.
  const result = await db.rpc("reserve_activity_reward", { p_activity_id: activityId });
  if (result.error) {
    if (result.error.code === "P0001" && result.error.message.includes("insufficient remaining budget")) {
      throw new Error("Campaign has insufficient remaining budget.");
    }
    throw new Error("Unable to reserve reward budget. Check campaign eligibility and the atomic budget migration.");
  }
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("Reward reservation returned no record.");
  return mapReward(row);
}