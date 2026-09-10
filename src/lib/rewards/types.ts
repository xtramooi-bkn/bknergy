export type RewardStatus = "pending" | "processing" | "distributed" | "failed";
export interface RewardRecord {
  id: string;
  activity_id: string;
  user_id: string | null;
  campaign_id: string | null;
  amount: number;
  status: RewardStatus;
  transaction_hash: string | null;
  brickken_transaction_id: string | null;
  created_at: string | null;
  distributed_at?: string | null;
  last_error?: string | null;
  distribution_attempts?: number;
}
export function mapReward(row: Record<string, unknown>): RewardRecord {
  const amount = Number(row.amount);
  if (typeof row.id !== "string" || typeof row.activity_id !== "string" || row.amount == null || !Number.isFinite(amount) || amount < 0 ||
      !["pending", "processing", "distributed", "failed"].includes(String(row.status))) throw new Error("Unexpected rewards table schema or invalid reward record.");
  const optionalString = (key: string) => typeof row[key] === "string" ? row[key] as string : null;
  return { id: row.id, activity_id: row.activity_id, amount, status: row.status as RewardStatus,
    user_id: optionalString("user_id"), campaign_id: optionalString("campaign_id"),
    transaction_hash: optionalString("transaction_hash"), brickken_transaction_id: optionalString("brickken_transaction_id"), created_at: optionalString("created_at"), distributed_at: optionalString("distributed_at"), last_error: optionalString("last_error"), distribution_attempts: Number(row.distribution_attempts ?? 0) };
}
