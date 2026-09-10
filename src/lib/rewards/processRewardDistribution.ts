import "server-only";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { distributeReward } from "@/src/lib/brickken/distributeReward";
import { mapReward } from "./types";

export async function processRewardDistribution(rewardId: string) {
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rewardId)) throw new Error("Invalid reward ID.");
 const db=getRewardAdminClient();
 const claim=await db.rpc("claim_reward_distribution",{p_reward_id:rewardId});
 if(claim.error || !claim.data?.[0]) throw new Error("Cannot claim reward: it may be missing, processing, distributed, or distribution storage is unavailable.");
 const attempt=claim.data[0];
 let result: Awaited<ReturnType<typeof distributeReward>>;
 try { result=await distributeReward(rewardId); }
 catch { result={status:"failed"}; }
 // Never store raw provider errors (they may contain credentials or personal data).
 // Future uncertain on-chain outcomes must remain processing until reconciled.
 const finished=await db.rpc("finish_reward_distribution",{
 p_reward_id:rewardId,p_attempt_id:attempt.distribution_attempt_id,p_outcome:result.status,
 p_transaction_hash:result.status==="success" ? result.transactionHash : null,
 p_brickken_transaction_id:result.status==="success" ? result.brickkenTransactionId ?? null : null,
 });
 // If persistence fails, leave processing locked; never call the distributor again automatically.
 if(finished.error || !finished.data?.[0]) throw new Error("Unable to save distribution outcome. Reconciliation is required before retrying.");
 return mapReward(finished.data[0]);
}
