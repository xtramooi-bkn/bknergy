"use client";

import { useEffect, useRef, useState } from "react";
import { type Deployment, type Provider, type NonceCounts, isLocalDevelopment, submitDeployment, verifyWallet, readNonceCounts, nonceProblem } from "@/src/lib/brickken/deployment";

export default function DeploymentReview({ deployment }: { deployment: Deployment }) {
  const tx = deployment.transaction;
  const provider = useRef<Provider | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const revision = useRef(0);
  const busy = useRef(false);
  const [connected, setConnected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [counts, setCounts] = useState<NonceCounts | null>(null);
  const nonceError = counts ? nonceProblem(tx.nonce, counts) : null;

  useEffect(() => () => cleanup.current?.(), []);

  function localOnly() {
    if (!isLocalDevelopment(process.env.NODE_ENV, window.location.host))
      throw new Error("This page is available only on localhost in development.");
  }

  async function connect() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(""); setConnected(""); setReviewed(false); setCounts(null);
    cleanup.current?.(); revision.current++;
    try {
      localOnly();
      const injected = (window as Window & { ethereum?: Provider }).ethereum;
      const wallet = injected?.providers?.find((p) => p.isMetaMask) ?? (injected?.isMetaMask ? injected : undefined);
      if (!wallet) throw new Error("MetaMask was not found. Open this localhost page in a browser with MetaMask installed.");
      provider.current = wallet;
      const invalidate = () => { revision.current++; setConnected(""); setReviewed(false); setCounts(null); };
      for (const event of ["accountsChanged", "chainChanged", "disconnect"]) wallet.on?.(event, invalidate);
      cleanup.current = () => { for (const event of ["accountsChanged", "chainChanged", "disconnect"]) wallet.removeListener?.(event, invalidate); };
      await wallet.request({ method: "eth_requestAccounts" });
      const version = revision.current;
      const account = await verifyWallet(wallet, tx);
      const nextCounts = await readNonceCounts(wallet, tx);
      if (version !== revision.current) throw new Error("Wallet changed. Connect again.");
      setConnected(account); setCounts(nextCounts);
    } catch (err) { setError(err instanceof Error ? err.message : "MetaMask connection was not completed."); }
    finally { busy.current = false; setPending(false); }
  }

  async function refreshCounts() {
    if (busy.current || !provider.current || !connected || attempted) return;
    busy.current = true; setPending(true); setError(""); setReviewed(false); setCounts(null);
    const version = revision.current;
    try {
      localOnly();
      const nextCounts = await readNonceCounts(provider.current, tx);
      if (version !== revision.current) throw new Error("Wallet changed. Connect again.");
      setCounts(nextCounts);
    } catch (err) {
      setConnected(""); setError(err instanceof Error ? err.message : "Nonce lookup failed.");
    } finally { busy.current = false; setPending(false); }
  }

  async function submit() {
    if (busy.current || attempted || !connected || !reviewed || !counts || nonceError || !provider.current) return;
    busy.current = true; setPending(true); setError(""); setAttempted(true);
    const version = revision.current;
    try {
      localOnly();
      const result = await submitDeployment(provider.current, deployment, () => revision.current === version,
        async () => {
          const response = await fetch("/admin/brickken/deploy/current", { cache: "no-store", credentials: "same-origin" });
          if (!response.ok) throw new Error("Cannot verify the current saved preparation. Reload before retrying.");
          return await response.json() as Deployment;
        }, (nextCounts) => { if (revision.current === version) setCounts(nextCounts); });
      setHash(result);
    } catch (err) {
      setError((err instanceof Error ? err.message : "The wallet request was not completed.") +
        " Check MetaMask activity before reloading this page to retry.");
    } finally { busy.current = false; setPending(false); }
  }

  const rows = [
    ["Network", "Base Sepolia · 84532"],
    ["From", tx.from], ["To · Brickken factory", tx.to], ["Value", "0 ETH (" + tx.value + ")"],
    ["Gas limit", Number(BigInt(tx.gasLimit)).toLocaleString("en-US") + " (" + tx.gasLimit + ")"],
    ["Calldata", deployment.calldataBytes + " bytes"], ["Calldata SHA-256", deployment.calldataSha256],
    ["Prepared nonce", String(tx.nonce)],
    ["Latest on-chain nonce", counts?.latest ?? "Connect MetaMask to check"],
    ["Pending nonce", counts?.pending ?? "Connect MetaMask to check"],
    ["Maximum fee per gas", tx.maxFeePerGas + " wei"],
    ["Priority fee per gas", tx.maxPriorityFeePerGas + " wei"], ["Preparation ID", deployment.txId],
  ];

  return <main className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
    <div><p className="text-sm font-semibold text-amber-700">LOCAL DEVELOPMENT · SANDBOX</p>
      <h1 className="mt-2 text-3xl font-bold">Deploy BKNergy Reward</h1>
      <p className="mt-3">Review the prepared BKNE deployment. Submitting opens MetaMask for your explicit confirmation.</p>
    </div>
    <dl className="divide-y rounded-xl border bg-white text-slate-900">
      {rows.map(([label, value]) => <div key={label} className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
        <dt className="font-semibold">{label}</dt><dd className="break-all font-mono text-sm">{value}</dd>
      </div>)}
    </dl>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Exact prepared calldata</summary>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{tx.data}</pre>
    </details>
    <p className="text-sm">Prepared fees are passed to MetaMask for review. The page does not refresh fees, replace the nonce, or change transaction contents. A stale nonce blocks submission. Review any fee estimate or adjustment shown by MetaMask before confirming.</p>
    <button type="button" onClick={connect} disabled={pending || attempted}
      className="rounded-lg border px-5 py-3 font-semibold disabled:opacity-40">Connect MetaMask</button>
    <button type="button" onClick={refreshCounts} disabled={!connected || pending || attempted}
      className="ml-3 rounded-lg border px-5 py-3 font-semibold disabled:opacity-40">Refresh nonce counts</button>
    <p aria-live="polite">{connected ? "Verified: dedicated BKNergy wallet on Base Sepolia." : "Wallet and Base Sepolia connection must be verified."}</p>
    <p aria-live="polite">{counts ? nonceError ?? "Prepared, latest and pending nonces match. Nonce 0 is valid when both counts are 0." : "Nonce counts have not been verified."}</p>
    <label className="flex items-start gap-3"><input type="checkbox" checked={reviewed}
      disabled={!connected || !counts || !!nonceError || pending || attempted} onChange={(event) => setReviewed(event.target.checked)} />
      <span>I have reviewed this transaction and want MetaMask to ask me to confirm deployment on Base Sepolia.</span>
    </label>
    <button type="button" onClick={submit} disabled={!connected || !reviewed || !counts || !!nonceError || pending || attempted}
      className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40">
      {pending && attempted ? "Waiting for MetaMask…" : "Submit deployment transaction"}
    </button>
    {error && <p role="alert" className="break-words rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
    {hash && <div role="status" className="rounded-lg border border-green-300 p-4">
      <p className="font-semibold">MetaMask returned a transaction hash</p><p className="mt-2 break-all font-mono">{hash}</p>
      <a className="mt-2 inline-block underline" href={"https://sepolia.basescan.org/tx/" + hash} target="_blank" rel="noreferrer">View on Base Sepolia explorer</a>
      <p className="mt-2">Submission does not confirm deployment success. Check the receipt before taking further action.</p>
    </div>}
  </main>;
}
