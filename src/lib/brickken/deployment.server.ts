import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { validateTransaction, type Deployment } from "./deployment";

export function parseDeployment(raw: string): Deployment {
  const response = JSON.parse(raw);
  if (!response || typeof response.txId !== "string" || !/^0x[0-9a-f]{64}$/i.test(response.txId) ||
      !Array.isArray(response.transactions) || response.transactions.length !== 1)
    throw new Error("Invalid preparation ID or transaction count.");
  const transaction = validateTransaction(response.transactions[0]);
  // The current local file is the source of truth. Hash its calldata for review, not against an old preparation.
  return {
    txId: response.txId, transaction, calldataBytes: (transaction.data.length - 2) / 2,
    calldataSha256: createHash("sha256").update(Buffer.from(transaction.data.slice(2), "hex")).digest("hex"),
  };
}

export async function loadDeployment() {
  return parseDeployment(await readFile(path.join(process.cwd(), "outputs", "bknergy-create-tokenization-response.json"), "utf8"));
}
