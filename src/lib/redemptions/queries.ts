import "server-only";
import {cache} from "react";
import {getRewardAdminClient} from "@/src/lib/supabase/rewardAdmin";
import type {RewardOverview} from "./types";
export const getRewardOverview=cache(async():Promise<RewardOverview>=>{
 const {data,error}=await getRewardAdminClient().rpc("get_demo_reward_overview");
 if(error||!data||!Array.isArray(data.campaigns)||!Array.isArray(data.redemptions))throw new Error("Reward accounting unavailable. Apply the participant redemption migration.");
 return data as RewardOverview;
});
