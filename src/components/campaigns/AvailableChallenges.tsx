import {participantCampaignGroups} from "@/src/lib/campaigns/participantVisibility";
import Link from "next/link";
import {isLocalRewardAdmin} from "@/src/lib/rewards/adminAccess";
import {getSponsorCatalog} from "@/src/lib/campaigns/sponsorQueries";
import {describeRule} from "@/src/lib/campaigns/types";
import {getCampaignRewardTotals} from "@/src/lib/rewards/getCampaignRewardTotals";
import CampaignCommandForm from "./CampaignCommandForm";
export default async function AvailableChallenges({compact=false}:{compact?:boolean}){
 if(!await isLocalRewardAdmin())return <p className="text-sm text-slate-500">Challenge joining is available in the local demo.</p>;
 const catalog=await getSponsorCatalog().catch(()=>null);
 if(!catalog)return <p className="mt-5 text-sm text-amber-800">Challenges unavailable. Apply the sponsor campaign migration and check demo identity setup.</p>;
 const campaigns=participantCampaignGroups(catalog).available.slice(0,compact?3:undefined);
 const balances=await Promise.all(campaigns.map(c=>getCampaignRewardTotals(c.id).catch(()=>null)));
 return <section className="mt-6 space-y-3"><div className="flex items-center justify-between"><h2 className="section-title">Available campaigns</h2>{compact&&<Link href="/challenges" className="text-xs text-teal-700">View all →</Link>}</div>{!campaigns.length&&<p className="text-sm text-slate-500">No open challenges available.</p>}<div className={compact?"grid gap-3 md:grid-cols-3":"grid gap-4 md:grid-cols-2"}>{campaigns.map((c,i)=>{const org=catalog.organisations.find(o=>o.id===c.organisation_id);const joined=catalog.participants.some(p=>p.campaign_id===c.id&&p.user_id===catalog.userId&&p.status==="active");const budget=balances[i];return <article key={c.id} className="panel p-4"><h3 className="font-semibold">{c.name}</h3><p className="mt-1 text-xs text-slate-500">{org?.name} · {org?.type.replaceAll("_"," ")}</p>{!compact&&<><p className="mt-3 text-sm">{c.description||"No description"}</p><p className="mt-2 text-xs">{c.start_date?.slice(0,10)??"No start date"} — {c.end_date?.slice(0,10)??"No end date"} · Audience: {c.audience.replaceAll("_"," ")}</p></>}<p className="mt-3 text-sm">Pool: {budget?.rewardPool??c.reward_pool} BKNE{!compact&&<> · Remaining: {budget?.remainingPool??c.remaining_pool} BKNE</>}</p>{(!budget||!budget.isConsistent)&&<p className="mt-2 text-xs text-amber-800">Budget integrity {budget?"mismatch — reconciliation required":"unverified"}.</p>}<ul className="mt-2 space-y-1 text-xs text-slate-500">{catalog.rules.filter(r=>r.campaign_id===c.id).slice(0,compact?2:undefined).map(r=><li key={r.id}>{r.activity_type}: {describeRule(r,"BKNE")}</li>)}</ul>{joined?<p className="mt-3 text-sm font-medium text-teal-700">Joined</p>:<CampaignCommandForm campaignId={c.id}/>}</article>})}</div></section>;

}
