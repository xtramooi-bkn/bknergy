import "server-only";
import { cache } from "react";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { mapRule } from "./types";
export interface Organisation {id:string;name:string;type:string}
export interface SponsorCampaign {redemption_bkne_per_eur?:number|null;id:string;organisation_id:string;name:string;description:string;start_date:string|null;end_date:string|null;reward_pool:number;remaining_pool:number;status:string;audience:string;max_reward_per_participant:number|null;max_reward_per_day:number|null}
export interface Participant {id:string;campaign_id:string;user_id:string;status:string;joined_at:string}
export const getSponsorCatalog=cache(async()=>{
 const db=getRewardAdminClient();
 async function all(table:string){const rows:Record<string,unknown>[]=[];for(let offset=0;;offset+=500){const {data,error}=await db.from(table).select("*").order("id").range(offset,offset+499);if(error)throw new Error("Campaign launch storage unavailable. Apply the sponsor campaign migration.");rows.push(...data);if(data.length<500)return rows;}}
 const [campaigns,organisations,rules,participants,identity]=await Promise.all([all("campaigns"),all("organisations"),all("reward_rules"),all("campaign_participants"),db.from("demo_participant").select("user_id").single()]);
 if(identity.error||!identity.data)throw new Error("Demo participant is not configured.");
 return {campaigns:campaigns.map(c=>({...c,reward_pool:Number(c.reward_pool),remaining_pool:Number(c.remaining_pool)})) as unknown as SponsorCampaign[],organisations:organisations as unknown as Organisation[],rules:rules.map(mapRule),participants:participants as unknown as Participant[],userId:identity.data.user_id as string};
});
export function isOpenCampaign(c:Pick<SponsorCampaign,"status"|"start_date"|"end_date">,today=new Date().toISOString().slice(0,10)) {
 return c.status==="active"&&(!c.start_date||c.start_date.slice(0,10)<=today)&&(!c.end_date||c.end_date.slice(0,10)>=today);
}
export function availableCampaigns(catalog:Awaited<ReturnType<typeof getSponsorCatalog>>) {
 return catalog.campaigns.filter(c=>isOpenCampaign(c)&&(c.audience==="public"||c.audience==="community"||catalog.participants.some(p=>p.campaign_id===c.id&&p.user_id===catalog.userId&&p.status==="active")));
}
