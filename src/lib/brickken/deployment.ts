export const DEPLOYMENT_WALLET = "0xE95900Ca65EF152a5D9FEe1c61b71bBeD00dFcF6";
export const DEPLOYMENT_FACTORY = "0x57751987DBf5461893F7317E3F38DA3d8AAb8D7C";

export type PreparedTransaction = {
  chainId: number; from: string; to: string; value: string; nonce: number;
  gasLimit: string; data: string; type: number;
  maxPriorityFeePerGas: string; maxFeePerGas: string;
};
export type Deployment = {
  txId: string; transaction: PreparedTransaction; calldataBytes: number; calldataSha256: string;
};
export type NonceCounts = { latest: string; pending: string };
export type Provider = {
  isMetaMask?: boolean;
  providers?: Provider[];
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: () => void): void;
  removeListener?(event: string, listener: () => void): void;
};

export function isLocalDevelopment(mode: string | undefined, host: string | null) {
  return mode === "development" && !!host &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i.test(host);
}

function nonnegativeQuantity(value: unknown): bigint {
  if (typeof value !== "string" || !/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value))
    throw new Error("Invalid transaction quantity.");
  return BigInt(value);
}

export function validateTransaction(input: unknown): PreparedTransaction {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Missing unsigned transaction.");
  const tx = input as PreparedTransaction;
  if (Object.keys(tx).sort().join(",") !== "chainId,data,from,gasLimit,maxFeePerGas,maxPriorityFeePerGas,nonce,to,type,value")
    throw new Error("Unexpected transaction fields.");
  if (tx.chainId !== 84532 || tx.from !== DEPLOYMENT_WALLET || tx.to !== DEPLOYMENT_FACTORY ||
      nonnegativeQuantity(tx.value) !== BigInt(0) || tx.type !== 2)
    throw new Error("Transaction must use the dedicated wallet, Brickken factory, zero value, type 2 and Base Sepolia.");
  if (!Number.isSafeInteger(tx.nonce) || tx.nonce < 0)
    throw new Error("Prepared nonce must be a non-negative safe integer.");
  if (nonnegativeQuantity(tx.gasLimit) <= BigInt(0) ||
      nonnegativeQuantity(tx.maxFeePerGas) < nonnegativeQuantity(tx.maxPriorityFeePerGas))
    throw new Error("Invalid prepared gas limit or fee bounds.");
  if (typeof tx.data !== "string" || !/^0x(?:[0-9a-fA-F]{2})+$/.test(tx.data))
    throw new Error("Calldata must be non-empty, complete hexadecimal bytes.");
  // Canonical property order, copied primitives, and no coercion of transaction contents.
  return {
    chainId: tx.chainId, from: tx.from, to: tx.to, value: tx.value, nonce: tx.nonce,
    gasLimit: tx.gasLimit, data: tx.data, type: tx.type,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas, maxFeePerGas: tx.maxFeePerGas,
  };
}

export function preparationSnapshot(deployment: Deployment) {
  if (!/^0x[0-9a-f]{64}$/i.test(deployment.txId)) throw new Error("Invalid preparation ID.");
  return JSON.stringify({ txId: deployment.txId, transaction: validateTransaction(deployment.transaction) });
}

export function assertWallet(chain: unknown, accounts: unknown, from: string) {
  if (typeof chain !== "string" || !/^0x[0-9a-f]+$/i.test(chain) || BigInt(chain) !== BigInt(84532))
    throw new Error("Select Base Sepolia (84532) in MetaMask, then connect again.");
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" ||
      accounts[0].toLowerCase() !== from.toLowerCase())
    throw new Error("Select the dedicated BKNergy wallet in MetaMask, then connect again.");
  return accounts[0] as string;
}

const quantity = (value: string | number) => "0x" + BigInt(value).toString(16);

// JSON-RPC quantities use hex; gasLimit is called gas. Calldata and addresses are copied verbatim.
export function toWalletTransaction(input: PreparedTransaction) {
  const tx = validateTransaction(input);
  return {
    chainId: quantity(tx.chainId), from: tx.from, to: tx.to, value: quantity(tx.value),
    nonce: quantity(tx.nonce), gas: quantity(tx.gasLimit), data: tx.data,
    type: quantity(tx.type), maxPriorityFeePerGas: quantity(tx.maxPriorityFeePerGas),
    maxFeePerGas: quantity(tx.maxFeePerGas),
  };
}

export async function verifyWallet(provider: Provider, tx: PreparedTransaction) {
  validateTransaction(tx);
  const chain = await provider.request({ method: "eth_chainId" });
  const accounts = await provider.request({ method: "eth_accounts" });
  return assertWallet(chain, accounts, tx.from);
}

function rpcNonce(value: unknown, tag: string) {
  let normalized: bigint;
  if (typeof value === "string" && /^0x[0-9a-f]+$/i.test(value)) {
    normalized = BigInt(value);
  } else if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    normalized = BigInt(value);
  } else if (typeof value === "bigint" && value >= BigInt(0)) {
    normalized = value;
  } else {
    throw new Error("MetaMask returned an invalid " + tag + " nonce. No stale-nonce conclusion can be made.");
  }
  // Keep decimal strings for display; nonceProblem compares them as exact bigints.
  return normalized.toString();
}

export async function readNonceCounts(provider: Provider, tx: PreparedTransaction): Promise<NonceCounts> {
  await verifyWallet(provider, tx);
  const latest = rpcNonce(await provider.request({
    method: "eth_getTransactionCount", params: [tx.from, "latest"],
  }), "latest");
  const pending = rpcNonce(await provider.request({
    method: "eth_getTransactionCount", params: [tx.from, "pending"],
  }), "pending");
  await verifyWallet(provider, tx);
  return { latest, pending };
}

export function nonceProblem(prepared: number, counts: NonceCounts): string | null {
  const nonce = BigInt(prepared), latest = BigInt(counts.latest), pending = BigInt(counts.pending);
  if (pending < latest) return "The RPC returned inconsistent counts (pending below latest). Refresh nonce counts.";
  if (nonce < latest) return "Prepared nonce " + nonce + " is stale: latest on-chain nonce is " + latest + ".";
  if (nonce < pending) return "Prepared nonce " + nonce + " conflicts with an outgoing pending transaction: pending nonce is " + pending + ".";
  if (nonce > latest || nonce > pending) return "Prepared nonce is ahead of the current counts. This page will not queue a deployment behind a nonce gap.";
  return null;
}

export async function submitDeployment(
  provider: Provider, deployment: Deployment, isCurrent: () => boolean,
  readCurrent: () => Promise<Deployment>, onCounts: (counts: NonceCounts) => void,
) {
  // Freeze a private copy before awaiting anything; compare the source again before sending.
  const reviewed = preparationSnapshot(deployment);
  const tx = Object.freeze(validateTransaction(deployment.transaction));
  const counts = await readNonceCounts(provider, tx);
  onCounts(counts);
  const problem = nonceProblem(tx.nonce, counts);
  if (problem) throw new Error(problem);
  if (preparationSnapshot(await readCurrent()) !== reviewed)
    throw new Error("The saved preparation changed after review. Reload and review it again.");
  await verifyWallet(provider, tx);
  if (!isCurrent()) throw new Error("Wallet or network changed. Connect again before submitting.");
  if (preparationSnapshot(deployment) !== reviewed)
    throw new Error("The reviewed transaction changed. Reload and review it again.");
  const hash = await provider.request({ method: "eth_sendTransaction", params: [toWalletTransaction(tx)] });
  if (typeof hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(hash))
    throw new Error("MetaMask did not return a valid hash. Check wallet activity before attempting anything else.");
  return hash;
}
