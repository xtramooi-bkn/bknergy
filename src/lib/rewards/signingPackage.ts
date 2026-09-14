import "server-only";
import { isLocalRewardAdmin } from "./adminAccess";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { BRICKKEN_CHAIN_ID, BRICKKEN_TOKEN_SYMBOL, BRICKKEN_TREASURY } from "@/src/lib/brickken/distributeReward";

const TOKEN_CONTRACT = "0xb83aaa1cbfa200be6970E6301C62769D0495836d";
const rewardId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txId = /^0x[0-9a-f]{64}$/i;

export type RewardSigningPackage = {
  rewardId: string;
  amount: number;
  tokenSymbol: "BKNE";
  tokenContract: string;
  network: "Base Sepolia";
  chainId: 84532;
  brickkenTransactionId: string;
  expectedSigner: string;
  recipientWallet: string;
  transactions: unknown[];
};

/** Returns only the persisted unsigned transaction and public transfer metadata. */
export async function getRewardSigningPackage(id: string): Promise<RewardSigningPackage> {
  if (!await isLocalRewardAdmin()) throw new Error("Local admin only.");
  if (!rewardId.test(id)) throw new Error("Invalid reward ID.");
  const db = getRewardAdminClient();
  const [{ data: reward, error: rewardError }, { data: prep, error: prepError }] = await Promise.all([
    db.from("rewards").select("id,amount,status").eq("id", id).maybeSingle(),
    db.from("reward_transfer_preparations").select("recipient_wallet,brickken_transaction_id,unsigned_transactions,transaction_hash").eq("reward_id", id).maybeSingle(),
  ]);
  if (rewardError || prepError || !reward || !prep || reward.status !== "processing") throw new Error("No prepared reward is available for download.");
  if (prep.transaction_hash || !Array.isArray(prep.unsigned_transactions) || !prep.unsigned_transactions.length || !txId.test(prep.brickken_transaction_id)) throw new Error("Prepared transfer is not safe to export.");
  const amount = Number(reward.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Prepared reward amount is invalid.");
  return { rewardId: reward.id, amount, tokenSymbol: BRICKKEN_TOKEN_SYMBOL, tokenContract: TOKEN_CONTRACT, network: "Base Sepolia", chainId: Number(BRICKKEN_CHAIN_ID) as 84532, brickkenTransactionId: prep.brickken_transaction_id, expectedSigner: BRICKKEN_TREASURY, recipientWallet: prep.recipient_wallet, transactions: prep.unsigned_transactions };
}
