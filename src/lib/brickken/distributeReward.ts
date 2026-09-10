import "server-only";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { mapReward } from "@/src/lib/rewards/types";

/** Future Brickken transfer_tokens integration point. Never called during reward creation. */
export type DistributionResult = { status: "not_connected"; rewardId?: string; message?: string } | { status: "failed" } | { status: "success"; transactionHash: string; brickkenTransactionId?: string };
export async function distributeReward(rewardId: string): Promise<DistributionResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rewardId)) throw new Error("Invalid reward ID.");
  const { data, error } = await getRewardAdminClient().from("rewards").select("*").eq("id", rewardId).maybeSingle();
  if (error) throw new Error("Unable to load reward for distribution.");
  if (!data) throw new Error("Reward not found.");
  const reward = mapReward(data);
  // ONLY future Brickken transfer_tokens integration point. The orchestrator already owns a processing claim.
  // Load recipient wallets server-side. Use reward.id as a stable provider idempotency key.
  // Reconcile ambiguous transfers before retrying; return success only after confirmation.
  // Current placeholder makes no Brickken calls or mutations.
  return { status: "not_connected" as const, rewardId: reward.id,
    message: "Ready for distribution. Brickken connection pending." };
}
