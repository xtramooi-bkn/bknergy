import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalDevelopment } from "@/src/lib/brickken/deployment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "BKNergy | Mint BKNE", robots: { index: false, follow: false } };

const steps = [
  { number: "01", title: "Investor & whitelist", status: "Waiting for Brickken investor setup", description: "The recipient investor must be created and whitelisted before the first BKNE mint can proceed.", action: "Configure investor" },
  { number: "02", title: "Mint BKNE", status: "Locked", description: "Mint 10,000 BKNE after the investor and wallet have been successfully whitelisted.", action: "Mint 10,000 BKNE" },
  { number: "03", title: "Reconcile", status: "Locked", description: "After the on-chain transaction is confirmed, reconcile the transaction with Brickken.", action: "Reconcile transaction" },
];

export default async function MintPage() {
  const requestHeaders = await headers();
  if (!isLocalDevelopment(process.env.NODE_ENV, requestHeaders.get("host"))) notFound();

  return <main className="admin-surface mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
    <section className="page-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Local development</p><h1 className="mt-2 text-3xl font-bold">Mint BKNE</h1><p className="mt-3 max-w-2xl text-slate-600">Prepare and manage tokenized BKNergy reward supply.</p></div>
        <span className="bkne-badge">Sandbox · Base Sepolia</span>
      </div>
    </section>
    <section className="panel p-5 md:p-6" aria-labelledby="token-information">
      <h2 id="token-information" className="section-title">Token information</h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Token</dt><dd className="mt-1 font-semibold text-slate-800">BKNergy Reward <span className="text-amber-700">· BKNE</span></dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Network</dt><dd className="mt-1 font-semibold text-slate-800">Base Sepolia</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decimals</dt><dd className="mt-1 font-semibold text-slate-800">18</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Token contract</dt><dd className="mt-1 break-all font-mono text-sm text-slate-700">0xb83aaa1cbfa200be6970E6301C62769D0495836d</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned initial mint</dt><dd className="mt-1 text-xl font-bold text-amber-700">10,000 BKNE</dd></div>
      </dl>
    </section>
    <section className="panel overflow-hidden" aria-labelledby="mint-flow">
      <div className="border-b border-slate-100 px-5 py-5 md:px-6"><h2 id="mint-flow" className="section-title">Mint flow</h2><p className="mt-2 text-sm text-slate-600">A guided sequence for the first BKNergy reward supply mint.</p></div>
      <ol className="divide-y divide-slate-100">
        {steps.map((step, index) => <li key={step.number} className="grid gap-4 p-5 md:grid-cols-[3rem_1fr_auto] md:items-center md:px-6">
          <span className={index === 0 ? "flex size-11 items-center justify-center rounded-xl bg-teal-50 font-mono text-sm font-bold text-teal-800 ring-1 ring-teal-100" : "flex size-11 items-center justify-center rounded-xl bg-slate-100 font-mono text-sm font-bold text-slate-500"}>{step.number}</span>
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{step.title}</h3><span className={index === 0 ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>{step.status}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{step.description}</p></div>
          <button type="button" disabled className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-70">{step.action}</button>
        </li>)}
      </ol>
      <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-4 text-sm text-amber-900 md:px-6">Blockchain actions are temporarily disabled while the Brickken investor/whitelist flow is being confirmed.</div>
    </section>
    <section className="panel p-5 md:p-6" aria-labelledby="planned-actions">
      <h2 id="planned-actions" className="section-title">Planned actions</h2><p className="mt-2 text-sm text-slate-600">These controls are intentionally inactive in this local-only preview.</p>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-70">Prepare whitelist</button><button type="button" disabled className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Mint 10,000 BKNE</button><button type="button" disabled className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-70">Reconcile transaction</button></div>
    </section>
  </main>;
}
