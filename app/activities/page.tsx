import Icon from "@/src/components/ui/Icon";
import { RewardBadge } from "@/src/components/ui/Brand";
import { sourceLabels } from "@/src/lib/activities/normalizeActivity";
import Link from "next/link";
import { getActivities } from "@/src/lib/activities/queries";
import { verifyActivity } from "@/src/lib/verification/verifyActivity";
import { previewActivityReward } from "@/src/lib/campaigns/queries";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const activities = await getActivities();
  const rewardContexts = await Promise.all(activities.map(activity => previewActivityReward(activity, verifyActivity(activity).score)));
  return <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><Link href="/" className="text-sm text-teal-700 hover:underline">← Dashboard</Link><header className="page-heading my-7"><h1 className="text-3xl font-semibold tracking-tight"><Icon name="run" className="size-7"/>Activities</h1><p className="mt-2 text-sm text-slate-500">Your latest activities, newest first.</p></header>{activities.length === 0 ? <div className="panel p-6"><h2 className="font-semibold">No activities yet</h2><p className="mt-2 text-sm text-slate-500">Activities will appear here when they are available.</p></div> : <ul className="space-y-3">{activities.map((activity, index) => {
    const verification = verifyActivity(activity);
    const reward = rewardContexts[index].amount;
    const badge = { VERIFIED: "bg-teal-50 text-teal-700", REVIEW: "bg-amber-50 text-amber-700", REJECTED: "bg-rose-50 text-rose-700" }[verification.status];
    return <li key={activity.id}><Link href={`/activities/${activity.id}`} className="panel activity-card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-teal-300"><div><h2 className="flex items-center gap-2 font-semibold"><Icon name={activity.type === "cycling" ? "cycle" : activity.type === "walking" ? "walk" : activity.type === "running" ? "run" : "workout"} className="size-5 text-blue-600"/>{activity.name}</h2><p className="mt-1 text-xs text-slate-500"><span className="capitalize">{activity.type}</span> · {sourceLabels[activity.source]} · {(activity.distanceMeters / 1000).toFixed(2)} km</p></div><div className="flex items-center gap-4"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${badge}`}>{verification.status}</span><RewardBadge>{reward} BKNE</RewardBadge><span aria-hidden="true">→</span></div></Link></li>;
  })}</ul>}</main>;
}
