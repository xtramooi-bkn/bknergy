import Icon from "@/src/components/ui/Icon";
import { RewardBadge } from "@/src/components/ui/Brand";
import ActivityCampaignSelector from "@/src/components/campaigns/ActivityCampaignSelector";
import ActivitySourceInfo from "@/src/components/activity/ActivitySourceInfo";
import { sourceLabels } from "@/src/lib/activities/normalizeActivity";
import ActivityRewardStatus from "@/src/components/rewards/ActivityRewardStatus";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityRouteMap from "@/src/components/activity/ActivityRouteMap";
import { getActivity } from "@/src/lib/activities/queries";
import { verifyActivity } from "@/src/lib/verification/verifyActivity";
import { previewActivityReward } from "@/src/lib/campaigns/queries";
import { describeRule } from "@/src/lib/campaigns/types";

export const dynamic = "force-dynamic";

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await getActivity(id);
  if (!activity) notFound();
  const verification = verifyActivity(activity);
  const rewardContext = await previewActivityReward(activity, verification.score);
  const reward = rewardContext.amount;
  const distanceKm = activity.distanceMeters / 1000;
  const speedKmh = distanceKm / (activity.durationSeconds / 3600);
  const pace = distanceKm > 0 ? `${formatTime(Math.round(activity.durationSeconds / distanceKm))} /km` : "Not available";
  const manual = activity.isManual;
  const tooFast = activity.type.toLowerCase() === "running" && speedKmh > 25;
  const checks = [
    { label: "GPS available", detail: activity.gpsAvailable ? "GPS data supplied by the activity." : "No GPS data supplied. −20 points.", state: activity.gpsAvailable ? "Passed" : "Missing" },
    { label: "Heart rate present", detail: activity.avgHeartRate != null ? `Average heart rate: ${activity.avgHeartRate} bpm.` : "No heart rate supplied. −10 points.", state: activity.avgHeartRate != null ? "Passed" : "Missing" },
    { label: "Source validation", detail: manual ? "Manually entered activity. −25 points." : `${sourceLabels[activity.source]} device source. The current rule accepts non-manual sources; provider authenticity is not checked.`, state: manual ? "Manual entry" : "Passed" },
    { label: "Pace plausible", detail: tooFast ? `${speedKmh.toFixed(1)} km/h exceeds the running limit of 25 km/h. −50 points.` : activity.type.toLowerCase() === "running" ? `${speedKmh.toFixed(1)} km/h is within the running limit of 25 km/h.` : "The current speed rule applies only to running.", state: tooFast ? "Failed" : activity.type.toLowerCase() === "running" ? "Passed" : "Not applicable" },
    { label: "Duplicate check", detail: "Placeholder only. Duplicate detection is not yet implemented and does not affect the score.", state: "Not checked" },
  ];
  const badgeStyle = { VERIFIED: "bg-teal-50 text-teal-700", REVIEW: "bg-amber-50 text-amber-700", REJECTED: "bg-rose-50 text-rose-700" }[verification.status];
  const metrics = [
    ["Distance", `${distanceKm.toFixed(2)} km`], ["Duration", formatTime(activity.durationSeconds)],
    ["Average pace", pace], ["Average heart rate", activity.avgHeartRate == null ? "Not available" : `${activity.avgHeartRate} bpm`],
    ["Max heart rate", activity.maxHeartRate == null ? "Not available" : `${activity.maxHeartRate} bpm`],
    ["Steps", activity.steps == null ? "Not available" : activity.steps.toLocaleString("en-US")],
  ];
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <Link href="/#activities" className="text-sm font-medium text-teal-700 hover:underline">← Back to dashboard</Link>
      <header className="page-heading my-7 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-semibold tracking-widest text-teal-700 uppercase"><Icon name="run" className="mr-2 inline size-4"/>Activity details</p><h1 className="text-3xl font-semibold tracking-tight">{activity.name}</h1><p className="mt-2 text-sm text-slate-500"><span className="capitalize">{activity.type}</span> · Source: {sourceLabels[activity.source]} · {activity.user}</p></div><span className={`rounded-md px-3 py-2 text-xs font-semibold ${badgeStyle}`}>{verification.status}</span></header><div className="panel mb-5 p-4"><ActivitySourceInfo activity={activity} /></div>
      <section className="panel activity-card overflow-hidden" aria-label="Activity route and performance"><ActivityRouteMap points={activity.routePoints} isMock={activity.isDemo} /><dl className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-3 sm:p-7">{metrics.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 text-lg font-semibold sm:text-xl">{value}</dd></div>)}</dl></section>
      <div className="mt-6 grid items-start gap-6 md:grid-cols-[1.7fr_1fr]">
        <section className="panel validation-card p-5 sm:p-7" aria-labelledby="verification-title"><div className="flex items-center justify-between gap-3"><h2 id="verification-title" className="text-lg font-semibold">Verification checks</h2><p data-status={verification.status} className="score-ring text-xl font-semibold">{verification.score}<span className="text-xs font-normal text-slate-500"> / 100</span></p></div><p className="mt-2 text-xs text-slate-500">Starts at 100 points. Deductions are cumulative; the minimum score is 0.</p><ul className="mt-4 divide-y divide-slate-100">{checks.map((check) => <li key={check.label} className="py-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{check.label}</h3><span className={`text-xs ${check.state === "Passed" ? "text-teal-700" : ["Missing", "Failed", "Manual entry"].includes(check.state) ? "text-amber-700" : "text-slate-500"}`}>{check.state}</span></div><p className="mt-1.5 text-xs leading-relaxed text-slate-500">{check.detail}</p></li>)}</ul><p className="border-t border-slate-100 pt-4 text-xs text-slate-500">80–100 Verified · 60–79 Review · 0–59 Rejected</p></section>
        <section className="panel reward-surface p-5 sm:p-6" aria-labelledby="reward-title"><h2 id="reward-title" className="text-sm font-semibold">Calculated activity reward</h2><p className="mt-3 text-xs text-slate-600">Campaign: {rewardContext.campaign?.name ?? "Not available"}</p><p className="mt-2 text-xs text-slate-500">Rule: {rewardContext.rule ? describeRule(rewardContext.rule, rewardContext.campaign?.token ?? "") : "No matched rule"}</p>{rewardContext.reason && <p className="mt-2 text-xs text-amber-800">{rewardContext.reason}</p>}<div className="mt-4"><RewardBadge className="text-xl">{reward} BKNE</RewardBadge></div><p className="mt-3 text-xs leading-relaxed text-slate-500">{verification.score >= 80 ? "Calculated from activity type and distance or duration using the current reward rules." : "A verification score of at least 80 is required to earn a reward."}</p><p className="mt-4 text-xs text-slate-500">Status: <span className="font-semibold">{verification.status}</span></p><ActivityRewardStatus activityId={activity.id} verified={verification.status === "VERIFIED" && !rewardContext.reason && reward > 0} /></section>
      </div>
      <ActivityCampaignSelector activity={activity} />
      <nav aria-label="Other activities" className="mt-7"><Link href="/activities" className="text-sm font-medium text-teal-700 hover:underline">View all activities →</Link></nav>
    </main>
  );
}
