import type { RewardRule } from "@/src/lib/campaigns/types";
type Activity = { type: string; distanceMeters?: number; durationSeconds?: number; steps?: number; campaignId?: string | null };

/** Distance is proportional; other metrics count completed threshold blocks. Round down to whole tokens. */
export function calculateReward(activity: Activity, verificationScore: number, rule: RewardRule | null) {
  if (!Number.isFinite(verificationScore) || verificationScore < 80 || !rule || activity.campaignId !== rule.campaign_id || activity.type.toLowerCase() !== rule.activity_type.toLowerCase()) return 0;
  if (!Number.isFinite(rule.reward_amount) || rule.reward_amount < 0 || !Number.isFinite(rule.threshold) || rule.threshold <= 0 ||
      (rule.max_reward !== null && (!Number.isFinite(rule.max_reward) || rule.max_reward < 0))) return 0;
  const metric = rule.metric === "distance_km" ? (activity.distanceMeters ?? 0) / 1000 : ["duration_minutes", "active_minutes"].includes(rule.metric) ? (activity.durationSeconds ?? 0) / 60 : rule.metric === "steps" ? activity.steps ?? 0 : rule.metric === "activity_count" ? 1 : NaN;
  if (!Number.isFinite(metric) || metric < 0) return 0;
  const units = rule.metric === "distance_km" ? metric / rule.threshold : Math.floor(metric / rule.threshold);
  const reward = Math.floor(Math.min(units * rule.reward_amount, rule.max_reward ?? Infinity));
  return Number.isSafeInteger(reward) ? reward : 0;
}
