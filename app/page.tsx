import MyCampaigns from "@/src/components/campaigns/MyCampaigns";
import AvailableChallenges from "@/src/components/campaigns/AvailableChallenges";
import ConnectedSources from "@/src/components/activity/ConnectedSources";
import ActivitySourceInfo from "@/src/components/activity/ActivitySourceInfo";
import { sourceLabels } from "@/src/lib/activities/normalizeActivity";
import Link from "next/link";
import Icon, { type IconName } from "@/src/components/ui/Icon";
import { BrandLogo, RewardBadge } from "@/src/components/ui/Brand";
import ActivityRouteMap from "@/src/components/activity/ActivityRouteMap";
import TimeAwareGreeting from "@/src/components/dashboard/TimeAwareGreeting";
import { getActivities } from "@/src/lib/activities/queries";
import { verifyActivity } from "@/src/lib/verification/verifyActivity";
import { previewActivityReward } from "@/src/lib/campaigns/queries";

const stats: { label: string; value: string; unit: string; icon: IconName; color: string }[] = [
  { label: "Distance", value: "24.8", unit: "km", icon: "distance", color: "bg-blue-50 text-blue-600" },
  { label: "Active minutes", value: "187", unit: "min", icon: "clock", color: "bg-blue-50 text-blue-600" },
  { label: "Steps", value: "63,420", unit: "", icon: "steps", color: "bg-indigo-50 text-indigo-600" },
  { label: "BKNE earned", value: "284", unit: "BKNE", icon: "reward", color: "bg-orange-50 text-orange-600" },
];
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [activity] = await getActivities(1);
  if (!activity) return <main className="mx-auto max-w-[1320px] px-5 py-10"><TimeAwareGreeting name="Johan"/><div className="panel mt-6 p-6"><h2 className="font-semibold">No activities yet</h2><p className="mt-2 text-sm text-slate-500">Your latest activity will appear here when it is available.</p><Link href="/activities" className="mt-4 inline-block text-sm text-teal-700">View activities →</Link></div><MyCampaigns /><AvailableChallenges compact /><ConnectedSources /></main>;
  const verification = verifyActivity(activity);
  const rewardContext = await previewActivityReward(activity, verification.score);
  const reward = rewardContext.amount;
  const distanceKm = activity.distanceMeters / 1000;
  const pace = distanceKm > 0 ? formatTime(Math.round(activity.durationSeconds / distanceKm)) : "—";
  const speed = distanceKm / (activity.durationSeconds / 3600);
  const statusStyle = { VERIFIED: "bg-teal-50 text-teal-700", REVIEW: "bg-amber-50 text-amber-700", REJECTED: "bg-rose-50 text-rose-700" }[verification.status];
  const checks = [
    { label: "GPS data", value: activity.gpsAvailable ? "Available" : "Missing", pass: activity.gpsAvailable },
    { label: "Heart rate", value: activity.avgHeartRate != null ? "Available" : "Missing", pass: activity.avgHeartRate != null },
    { label: "Device source", value: sourceLabels[activity.source], pass: !activity.isManual },
    { label: "Pace plausibility", value: speed > 25 ? "Needs review" : "Within range", pass: speed <= 25 },
    { label: "Duplicate check", value: "Not checked", pass: null },
  ];

  return (
    <div>
      <a href="#dashboard" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to dashboard</a>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-7 px-5 pt-5 sm:px-8 lg:px-12 lg:pt-0">
          <a href="#dashboard" className="flex items-center gap-2.5 text-2xl font-bold tracking-[-0.06em]"><BrandLogo /></a>
          <nav aria-label="Main navigation" className="order-3 flex w-full gap-6 overflow-x-auto text-[13px] lg:order-none lg:w-auto">{[["Dashboard", "dashboard"], ["Activities", "activities"], ["Challenges", "challenges"], ["Rewards", "rewards"], ["Wallet", "wallet"]].map(([label, id]) => <a key={id} href={id === "activities" ? "/activities" : id === "challenges" ? "/challenges" : id === "rewards" ? "/rewards" : `#${id}`} aria-current={id === "dashboard" ? "page" : undefined} className={`nav-link whitespace-nowrap border-b-2 px-2 py-6 transition hover:text-teal-700 ${id === "dashboard" ? "border-teal-700 font-semibold text-teal-700" : "border-transparent text-slate-500"}`}><Icon name={id === "activities" ? "run" : id === "challenges" ? "campaign" : id === "rewards" ? "reward" : id === "wallet" ? "wallet" : "dashboard"} className="size-4" />{label}</a>)}</nav>
          <div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-full bg-[#e8eee7] text-xs font-semibold text-teal-900">J</span><span className="hidden text-xs font-semibold sm:block">Johan</span></div>
        </div>
      </header>
      <main id="dashboard" className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div className="hero-heading"><p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-teal-700 uppercase">Live prototype · Brickken Sandbox · Base Sepolia</p><TimeAwareGreeting name={activity.user}/><p className="mt-2 text-sm text-slate-500">Turn verified healthy activity into programmable tokenized rewards.</p><p className="mt-1 text-sm text-slate-500">Funded by employers, insurers, governments and brands.</p></div><ActivitySourceInfo activity={activity} /></div>

        <section aria-label="BKNergy reward process" className="panel mb-7 flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><p className="font-medium text-teal-800">Move <span className="mx-1 text-slate-300">→</span> Verify <span className="mx-1 text-slate-300">→</span> Campaign <span className="mx-1 text-slate-300">→</span> BKNE <span className="mx-1 text-slate-300">→</span> Redeem</p><p className="text-xs text-slate-500">Reward distribution powered by Brickken tokenization infrastructure.</p></section>        <section id="activities" aria-labelledby="latest-title" className="scroll-mt-6"><div className="mb-3 flex items-center justify-between"><h2 id="latest-title" className="section-title">Latest activity</h2><span className="text-[11px] text-slate-400">Your effort, in focus</span></div>
          <article className="panel activity-card overflow-hidden"><Link href={`/activities/${activity.id}`} aria-label={`View ${activity.name} details`} className="block transition hover:bg-slate-50/50">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><span className="flex activity-heading-icon size-11 items-center justify-center rounded-xl"><Icon name="run" className="size-6" /></span><div><h3 className="text-xl font-semibold tracking-tight">{activity.name}</h3><p className="mt-1 text-xs text-slate-500"><span className="capitalize">{activity.type}</span> <span className="mx-1 text-slate-300">/</span> {sourceLabels[activity.source]}</p></div></div><span className={`trust-badge flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-semibold tracking-wide ${statusStyle}`}><Icon name="check" className="size-3.5" />{verification.status}</span></div>
            <div className="grid lg:grid-cols-[1.65fr_1fr]">
              <ActivityRouteMap points={activity.routePoints} isMock={activity.isDemo} />
              <div className="flex flex-col justify-between p-5 sm:p-7"><dl className="metric-values grid grid-cols-2 gap-x-5 gap-y-7">{[["Distance", distanceKm.toFixed(2), "km"], ["Moving time", formatTime(activity.durationSeconds), ""], ["Average pace", pace, "/km"], ["Avg heart rate", activity.avgHeartRate == null ? "—" : String(activity.avgHeartRate), "bpm"]].map(([label, value, unit]) => <div key={label}><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1.5 text-3xl font-semibold tracking-tight">{value} <span className="text-xs font-normal text-slate-400">{unit}</span></dd></div>)}</dl><div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2 text-xs text-slate-500"><Icon name="reward" className="size-4 text-amber-700" />Activity reward</span><RewardBadge>+{reward} BKNE</RewardBadge></div></div>
            </div>
          </Link></article>
        </section>

        <MyCampaigns />
        <AvailableChallenges compact />

        <section aria-labelledby="performance-title" className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 id="performance-title" className="section-title">Weekly performance</h2><span className="text-[11px] text-slate-400">This week</span></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map((stat) => <article key={stat.label} className={`panel kpi-card p-4 sm:p-5 ${stat.icon === "reward" ? "kpi-reward" : ""}`}><div className="flex items-center justify-between"><span className={`flex size-9 items-center justify-center rounded-lg ${stat.color}`}><Icon name={stat.icon} /></span><span className="hidden text-[9px] tracking-wider text-slate-400 uppercase sm:block">This week</span></div><h3 className="mt-4 text-xs text-slate-500">{stat.label}</h3><p className="mt-1 flex flex-wrap items-baseline gap-1.5"><span className="text-2xl font-semibold tracking-tight sm:text-3xl">{stat.value}</span><span className="text-[11px] text-slate-400">{stat.unit}</span></p></article>)}</div></section>

        <section aria-labelledby="validation-title" className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 id="validation-title" className="section-title">Activity validation</h2><span className="text-[11px] text-slate-400">Your activity, checked</span></div><article className="panel validation-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">Good data. Recognised effort.</h3><p className="mt-1 text-[11px] text-slate-500">A closer look at your activity data.</p></div><span data-status={verification.status} className="score-ring text-xl font-semibold">{verification.score}<span className="text-xs font-normal text-slate-400">/100</span></span></div><ul className="mt-4 divide-y divide-slate-100">{checks.map((check) => <li key={check.label} className="flex items-center justify-between py-2 text-xs"><span className="flex items-center gap-2 text-slate-600"><Icon name={check.label === "GPS data" ? "gps" : check.label === "Heart rate" ? "heart" : check.label === "Device source" ? "device" : check.label === "Pace plausibility" ? "pulse" : "copy"} className="size-4 shrink-0" /><span className={check.pass === null ? "text-slate-400" : check.pass ? "text-teal-600" : "text-amber-600"} aria-hidden="true">{check.pass === null ? "—" : check.pass ? "✓" : "!"}</span>{check.label}</span><span className={check.pass === null ? "text-slate-400" : "text-slate-600"}>{check.value}</span></li>)}</ul><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="text-[10px] text-slate-400">Duplicate detection · Planned</span><span className={`rounded px-2 py-1 text-[10px] font-semibold ${statusStyle}`}>{verification.status}</span></div></article></section>
        <section id="rewards" className="mt-7 scroll-mt-6" aria-labelledby="rewards-title"><h2 id="rewards-title" className="section-title mb-3">Your movement, rewarded</h2><div className="panel grid sm:grid-cols-[1fr_1.2fr]"><div id="wallet" className="wallet-surface rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl scroll-mt-6 p-5 sm:border-r sm:border-slate-100 sm:p-6"><p className="flex items-center gap-2 text-xs text-slate-500"><Icon name="wallet" className="size-4"/>BKNE balance</p><p className="mt-2 text-3xl font-semibold tracking-tight">1,188 <span className="text-sm font-medium text-slate-400">BKNE</span></p><p className="mt-2 text-[11px] text-teal-700">+284 BKNE earned this week</p></div><div className="flex items-center gap-4 border-t border-slate-100 p-5 sm:border-0 sm:p-6"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Icon name="reward" className="size-6" /></span><div><h3 className="text-sm font-semibold">You exercise first. Rewards follow.</h3><p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">Your verified activities turn everyday consistency into BKNE rewards. Keep doing what makes you feel good.</p></div></div></div></section>
        <ConnectedSources /><footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5 text-[10px] text-slate-400"><p>BKNergy · Built for your everyday athlete.</p><p>Brickken infrastructure · Sandbox connected <span className="mx-2">/</span> Summary metrics are demo data</p></footer>
      </main>
    </div>
  );
}
