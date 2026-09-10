export type RewardMetric = "distance_km" | "duration_minutes" | "active_minutes" | "steps" | "activity_count";
export interface RewardRule {
  id: string;
  campaign_id: string;
  activity_type: string;
  metric: RewardMetric;
  reward_amount: number;
  threshold: number;
  max_reward: number | null;
}
export interface Campaign {
  id: string;
  name: string;
  token: string;
  reward_pool: number;
  remaining_pool: number;
  status: string;
}
export function mapRule(row: Record<string, unknown>): RewardRule {
  const amount = Number(row.reward_amount), threshold = Number(row.threshold);
  const cap = row.max_reward == null ? null : Number(row.max_reward);
  if (typeof row.id !== "string" || typeof row.campaign_id !== "string" || typeof row.activity_type !== "string" ||
    !["distance_km", "duration_minutes", "active_minutes", "steps", "activity_count"].includes(String(row.metric)) || row.reward_amount == null || row.threshold == null ||
    !Number.isFinite(amount) || amount < 0 || !Number.isFinite(threshold) || threshold <= 0 || (cap !== null && (!Number.isFinite(cap) || cap < 0))) throw new Error("Invalid campaign reward rule.");
  return { id: row.id, campaign_id: row.campaign_id, activity_type: row.activity_type.toLowerCase(), metric: row.metric as RewardMetric, reward_amount: amount, threshold, max_reward: cap };
}
export function describeRule(rule: RewardRule, token: string) {
  return `${rule.reward_amount} ${token} per ${rule.threshold} ${rule.metric === "distance_km" ? "km" : rule.metric === "steps" ? "steps" : rule.metric === "activity_count" ? "activities" : "active minutes"}${rule.max_reward === null ? "" : ` · Maximum ${rule.max_reward} ${token} per activity`}`;
}
