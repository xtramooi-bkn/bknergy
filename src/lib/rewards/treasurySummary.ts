import "server-only";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { BRICKKEN_TREASURY } from "@/src/lib/brickken/distributeReward";

const token = "0xb83aaa1cbfa200be6970E6301C62769D0495836d";
const balanceOf = "0x70a08231" + BRICKKEN_TREASURY.slice(2).padStart(64, "0");
export type TreasurySummary = { balance: string | null; pending: number; distributed: number; reserved: number };

export async function getTreasurySummary(): Promise<TreasurySummary> {
  const db = getRewardAdminClient();
  const { data } = await db.from("rewards").select("amount,status");
  const totals = (data ?? []).reduce((result, row) => {
    const amount = Number(row.amount) || 0;
    if (row.status === "pending") result.pending += amount;
    if (row.status === "distributed") result.distributed += amount;
    if (row.status === "pending" || row.status === "processing" || row.status === "failed") result.reserved += amount;
    return result;
  }, { pending: 0, distributed: 0, reserved: 0 });
  const rpc = process.env.BRICKKEN_BASE_SEPOLIA_RPC_URL?.trim();
  if (!rpc) return { ...totals, balance: null };
  try {
    const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: token, data: balanceOf }, "latest"] }), cache: "no-store" });
    const body = await response.json() as { result?: string };
    if (!response.ok || !/^0x[0-9a-f]+$/i.test(body.result ?? "")) throw new Error("invalid balance");
    return { ...totals, balance: (BigInt(body.result!) / BigInt(10) ** BigInt(18)).toString() };
  } catch { return { ...totals, balance: null }; }
}
