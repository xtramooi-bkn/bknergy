import "server-only";
import { getCampaignRewardTotals } from "@/src/lib/rewards/getCampaignRewardTotals";
import { getCampaignCatalog } from "@/src/lib/campaigns/queries";
import { describeRule } from "@/src/lib/campaigns/types";

export default async function ActiveCampaignCard() {
  let catalog;
  try { catalog = await getCampaignCatalog(); }
  catch { return <article className="panel p-5 text-sm text-slate-500">Campaigns are unavailable. Check database setup and permissions.</article>; }
  const { campaigns, rules } = catalog;
  const active = campaigns.filter(campaign => campaign.status === "active");
  if (!active.length) return <article className="panel p-5 text-sm text-slate-500">No active campaign.</article>;
  const totals = await Promise.all(active.map(campaign => getCampaignRewardTotals(campaign.id).catch(() => null)));
  return <div className="@container"><div className="grid auto-rows-fr gap-3 @min-[30rem]:grid-cols-2 @min-[48rem]:grid-cols-3">
    {active.map((campaign, index) => {
      const total = totals[index];
      const campaignRules = rules.filter(rule => rule.campaign_id === campaign.id);
      return <article key={campaign.id} className="panel flex min-w-0 flex-col bg-gradient-to-br from-white to-teal-50/70 p-4">
        <span className="self-start rounded-md bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">Active</span>
        <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-semibold leading-6 tracking-tight" title={campaign.name}>{campaign.name}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div><dt className="text-slate-500">Reward pool</dt><dd className="mt-1 break-words font-semibold">{(total?.rewardPool ?? campaign.reward_pool).toLocaleString("en-US")} {campaign.token}</dd></div>
          <div><dt className="text-slate-500">Remaining pool</dt><dd className="mt-1 break-words font-semibold text-teal-700">{(total?.remainingPool ?? campaign.remaining_pool).toLocaleString("en-US")} {campaign.token}</dd></div>
          {total && <>
            <div><dt className="text-slate-500">Distributed</dt><dd className="mt-1">{total.distributed.toLocaleString("en-US")} {campaign.token}</dd></div>
            <div><dt className="text-slate-500">Pending</dt><dd className="mt-1">{total.pending.toLocaleString("en-US")} {campaign.token}</dd></div>
            <div><dt className="text-slate-500">Processing / failed</dt><dd className="mt-1">{total.processing} / {total.failed} {campaign.token}</dd></div>
            <div><dt className="text-slate-500">Rewarded activities</dt><dd className="mt-1">{total.activityCount}</dd></div>
          </>}
        </dl>
        {total && !total.isConsistent && <p role="alert" className="mt-3 text-xs text-amber-800">Budget mismatch: {total.reserved.toLocaleString("en-US")} {campaign.token} reserved; expected remaining {total.expectedRemaining.toLocaleString("en-US")} {campaign.token}. Reconciliation required.{total.overReserved ? " Reservations exceed the total pool." : ""}</p>}
        {!total && <p className="mt-3 text-xs text-amber-800">Budget integrity could not be verified. Displayed pool values are unverified; check the reconciliation migration.</p>}
        <div className="mt-auto pt-3">
          {campaignRules.length ? <details className="border-t border-teal-100 pt-3">
            <summary className="cursor-pointer text-xs font-medium text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-700">View reward rules ({campaignRules.length})<span className="sr-only"> for {campaign.name}</span></summary>
            <ul className="mt-2 space-y-2 text-xs text-slate-500">{campaignRules.map(rule => <li key={rule.id}><span className="capitalize">{rule.activity_type}</span>: {describeRule(rule, campaign.token)}</li>)}</ul>
          </details> : <p className="text-xs text-slate-500">No reward rules configured.</p>}
        </div>
      </article>;
    })}
  </div></div>;
}
