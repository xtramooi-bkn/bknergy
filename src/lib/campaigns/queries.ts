import "server-only";
import { cache } from "react";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { mapRule, type Campaign } from "./types";
import type { Activity } from "@/src/lib/activities/activity";
import { calculateReward } from "@/src/lib/rewards/calculateReward";

export const getCampaignCatalog = cache(async () => {
  const db = getRewardAdminClient();
  const [campaigns, rules] = await Promise.all([db.from("campaigns").select("id,name,token,reward_pool,remaining_pool,status").order("id"), db.from("reward_rules").select("*")]);
  if (campaigns.error || rules.error) throw new Error("Campaign rules are unavailable. Apply the campaign SQL and check server read permissions.");
  const mapped: Campaign[] = (campaigns.data ?? []).map(row => {
    const pool = Number(row.reward_pool);
    const remaining = Number(row.remaining_pool);
    if (row.remaining_pool == null || !Number.isFinite(remaining) || remaining < 0 || remaining > pool) throw new Error("Invalid campaign remaining budget.");
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.token !== "string" || typeof row.status !== "string" || row.reward_pool == null || !Number.isFinite(pool) || pool < 0) throw new Error("Invalid campaign data.");
    return { id: row.id, name: row.name, token: row.token, reward_pool: pool, remaining_pool: remaining, status: row.status };
  });
  return { campaigns: mapped, rules: (rules.data ?? []).map(mapRule) };
});

export async function getActivityRewardContext(activity: Activity, score: number) {
  if (!activity.campaignId) return { campaign: null, rule: null, amount: 0, reason: "No campaign is linked to this activity." };
  const catalog = await getCampaignCatalog();
  const campaign = catalog.campaigns.find(item => item.id === activity.campaignId) ?? null;
  const matches = catalog.rules.filter(item => item.campaign_id === activity.campaignId && item.activity_type === activity.type.toLowerCase());
  if (matches.length > 1) throw new Error("Multiple reward rules match this activity. Resolve the duplicate rules first.");
  const rule = matches[0] ?? null;
  const reason = !campaign ? "Campaign not found." : campaign.status !== "active" ? "Campaign is not active." : !rule ? "No reward rule matches this activity." : score < 80 ? "Activity must be verified to earn a reward." : null;
  return { campaign, rule, amount: reason ? 0 : calculateReward(activity, score, rule), reason };
}

export async function previewActivityReward(activity: Activity, score: number) {
  try { return await getActivityRewardContext(activity, score); }
  catch { return { campaign: null, rule: null, amount: 0, reason: "Campaign rules are unavailable. Reward creation is disabled." }; }
}
