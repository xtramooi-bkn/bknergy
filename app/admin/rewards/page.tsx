import Link from "next/link";
import { isLocalRewardAdmin } from "@/src/lib/rewards/adminAccess";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { mapReward } from "@/src/lib/rewards/types";
import DistributeButton from "@/src/components/rewards/DistributeButton";
export default async function AdminRewardsPage() {
 if(!await isLocalRewardAdmin()) return <main className="p-8">Reward administration is available only in local development until admin authentication is connected.</main>;
 const db=getRewardAdminClient();
 const rows:Record<string,unknown>[]=[];
 for(let offset=0;;offset+=500) {
 const {data,error}=await db.from("rewards").select("*, activities(name), campaigns(name)").order("created_at",{ascending:false}).order("id").range(offset,offset+499);
 if(error) return <main className="p-8">Reward storage unavailable. Check server permissions and required migrations.</main>;
 rows.push(...data);if(data.length<500) break;
 }
 const name=(value:unknown)=> value && typeof value==="object" && "name" in value ? String(value.name) : "Unassigned";
 return <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8"><Link href="/" className="text-sm text-teal-700">← Dashboard</Link><h1 className="text-3xl font-semibold">Reward administration</h1><p className="text-sm text-slate-500">Local demo · Brickken not connected. Reserved campaign budgets remain unchanged.</p>{(["pending","processing","distributed","failed"] as const).map(status=><section key={status} className="space-y-3"><h2 className="text-xl font-semibold capitalize">{status}</h2>{!rows.some(r=>r.status===status)&&<p className="text-sm text-slate-500">No rewards</p>}{rows.filter(r=>r.status===status).map(row=>{const r=mapReward(row);return <article key={r.id} className="panel p-5"><h3 className="font-semibold">{name(row.activities)} · {r.amount} BKNE</h3><dl className="mt-3 grid gap-2 break-all text-sm sm:grid-cols-2"><div>Reward ID: {r.id}</div><div>User: {r.user_id ?? "Unassigned demo user"}</div><div>Campaign: {name(row.campaigns)}</div><div>Status: {r.status}</div><div>Created: {r.created_at ?? "Unknown"}</div><div>Attempts: {r.distribution_attempts}</div>{r.transaction_hash&&<div>Transaction: {r.transaction_hash}</div>}{r.distributed_at&&<div>Distributed: {r.distributed_at}</div>}</dl>{r.last_error&&<p role="status" className="mt-3 text-sm text-amber-800">{r.last_error}</p>}{status==="processing"&&<p className="mt-3 text-sm">Distribution in progress. Interrupted attempts require reconciliation.</p>}{(status==="pending"||status==="failed")&&<DistributeButton rewardId={r.id} retry={status==="failed"}/>}</article>})}</section>)}</main>;
}
