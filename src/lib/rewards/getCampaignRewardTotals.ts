import "server-only";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";

export async function getCampaignRewardTotals(campaignId: string) {
 const {data,error}=await getRewardAdminClient().rpc("get_campaign_budget_integrity",{p_campaign_id:campaignId});
 const row=data?.[0];
 if(error || !row) throw new Error("Campaign budget integrity unavailable. Apply the reconciliation migration.");
 const number=(key:string)=>{const value=Number(row[key]);if(row[key]==null || !Number.isFinite(value) || value<0) throw new Error("Invalid campaign budget snapshot.");return value;};
 return {pending:number("pending"),processing:number("processing"),distributed:number("distributed"),failed:number("failed"),
 activityCount:number("activity_count"),rewardPool:number("reward_pool"),remainingPool:number("remaining_pool"),
 reserved:number("reserved"),expectedRemaining:number("expected_remaining"),isConsistent:row.is_consistent===true,overReserved:row.over_reserved===true};
}
