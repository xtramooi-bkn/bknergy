import {getCampaignRewardTotals} from "@/src/lib/rewards/getCampaignRewardTotals";
export default async function CampaignBudgetSummary({campaignId}:{campaignId:string}){
 const t=await getCampaignRewardTotals(campaignId).catch(()=>null);
 if(!t)return <p className="mt-3 text-sm text-amber-800">Budget integrity unavailable. Check reconciliation migration.</p>;
 return <div className="mt-3 space-y-2 text-sm"><p>Pool: {t.rewardPool} BKNE · Remaining: {t.remainingPool} BKNE</p><p>Pending: {t.pending} · Processing: {t.processing} · Distributed: {t.distributed} · Failed: {t.failed} BKNE</p><p>Rewarded activities: {t.activityCount}</p><p className={t.isConsistent?"text-teal-700":"text-amber-800"}>Budget integrity: {t.isConsistent?"Consistent":"Mismatch — reconciliation required. Expected remaining: "+t.expectedRemaining+" BKNE"}</p></div>;
}
