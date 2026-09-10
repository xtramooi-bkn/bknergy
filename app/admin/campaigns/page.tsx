import Link from "next/link";
import {isLocalRewardAdmin} from "@/src/lib/rewards/adminAccess";
import {getSponsorCatalog} from "@/src/lib/campaigns/sponsorQueries";
import CampaignBudgetSummary from "@/src/components/campaigns/CampaignBudgetSummary";
export default async function AdminCampaignsPage(){
 if(!await isLocalRewardAdmin())return <main className="p-8">Campaign administration is available only in local development.</main>;
 let catalog;try{catalog=await getSponsorCatalog();}catch{return <main className="p-8">Campaign storage unavailable. Apply the sponsor campaign migration.</main>;}
 return <main className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8"><nav className="flex gap-5 text-sm text-teal-700"><Link href="/">Dashboard</Link><Link href="/admin/rewards">Rewards</Link><Link href="/admin/campaigns/new">Create campaign →</Link></nav><h1 className="text-3xl font-semibold">Sponsor campaigns</h1><div className="grid gap-4 md:grid-cols-2">{catalog.campaigns.map(c=><article key={c.id} className="panel p-5"><Link href={"/admin/campaigns/"+c.id} className="text-lg font-semibold text-teal-700">{c.name} →</Link><p className="mt-2 text-sm">{catalog.organisations.find(o=>o.id===c.organisation_id)?.name} · {c.status}</p><p className="mt-2 text-sm">Active participants: {catalog.participants.filter(p=>p.campaign_id===c.id&&p.status==="active").length}</p><CampaignBudgetSummary campaignId={c.id}/></article>)}</div></main>;
}
