import Link from "next/link";
import {isLocalRewardAdmin} from "@/src/lib/rewards/adminAccess";
import {getSponsorCatalog} from "@/src/lib/campaigns/sponsorQueries";
import CampaignLaunchForm from "@/src/components/campaigns/CampaignLaunchForm";
export default async function NewCampaignPage(){
 if(!await isLocalRewardAdmin())return <main className="p-8">Campaign administration is available only in local development.</main>;
 let catalog;try{catalog=await getSponsorCatalog();}catch{return <main className="p-8">Apply the sponsor campaign migration before creating campaigns.</main>;}
 return <main className="mx-auto max-w-4xl space-y-5 p-5 sm:p-8"><Link href="/admin/campaigns" className="text-sm text-teal-700">← Campaigns</Link><h1 className="text-3xl font-semibold">Create a campaign</h1><p className="text-sm text-slate-500">Sponsor healthy activity with a simulated BKNE reward pool.</p><CampaignLaunchForm organisations={catalog.organisations}/></main>;
}
