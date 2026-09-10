import ConversionSetting from "@/src/components/redemptions/ConversionSetting";
import Link from "next/link";
import {notFound} from "next/navigation";
import {isLocalRewardAdmin} from "@/src/lib/rewards/adminAccess";
import {getSponsorCatalog} from "@/src/lib/campaigns/sponsorQueries";
import {describeRule} from "@/src/lib/campaigns/types";
import {validId} from "@/src/lib/campaigns/launchValidation";
import CampaignBudgetSummary from "@/src/components/campaigns/CampaignBudgetSummary";
import CampaignCommandForm from "@/src/components/campaigns/CampaignCommandForm";
export default async function AdminCampaignPage({params}:{params:Promise<{id:string}>}){
 if(!await isLocalRewardAdmin())return <main className="p-8">Campaign administration is available only in local development.</main>;
 const {id}=await params;if(!validId(id))notFound();
 let catalog;try{catalog=await getSponsorCatalog();}catch{return <main className="p-8">Campaign storage unavailable. Check migration setup.</main>;}
 const c=catalog.campaigns.find(c=>c.id===id);if(!c)notFound();const org=catalog.organisations.find(o=>o.id===c.organisation_id);const participants=catalog.participants.filter(p=>p.campaign_id===id);
 return <main className="mx-auto max-w-4xl space-y-5 p-5 sm:p-8"><Link href="/admin/campaigns" className="text-sm text-teal-700">← Campaigns</Link><h1 className="text-3xl font-semibold">{c.name}</h1><section className="panel space-y-3 p-5"><p>{org?.name} · {org?.type.replaceAll("_"," ")}</p><p>{c.description||"No description"}</p><p className="text-sm">{c.start_date?.slice(0,10)??"No start date"} — {c.end_date?.slice(0,10)??"No end date"} · {c.status} · {c.audience.replaceAll("_"," ")}</p><p className="text-sm">Participant cap: {c.max_reward_per_participant??"None"} · Daily participant cap: {c.max_reward_per_day??"None"} BKNE (UTC reservation day)</p><CampaignCommandForm command="status" campaignId={id}/></section><section className="panel p-5"><h2 className="font-semibold">Reward rules</h2><ul className="mt-3 space-y-2 text-sm">{catalog.rules.filter(r=>r.campaign_id===id).map(r=><li key={r.id}>{r.activity_type}: {describeRule(r,"BKNE")}</li>)}</ul><CampaignBudgetSummary campaignId={id}/></section><section className="panel p-5"><h2 className="font-semibold">Participants ({participants.filter(p=>p.status==="active").length} active)</h2>{!participants.length&&<p className="mt-3 text-sm">No participants yet.</p>}<ul className="mt-3 space-y-3 break-all text-sm">{participants.map(p=><li key={p.id}>{p.user_id===catalog.userId?"Johan (demo)":p.user_id} · {p.status} · Joined {p.joined_at}</li>)}</ul></section><ConversionSetting campaignId={id} rate={c.redemption_bkne_per_eur??null}/><p className="text-xs text-slate-500">Pool funding is simulated. Brickken is not connected.</p></main>;
}
