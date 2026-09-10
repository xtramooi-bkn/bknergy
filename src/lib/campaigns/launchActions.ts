"use server";
import { revalidatePath } from "next/cache";
import { getRewardAdminClient } from "@/src/lib/supabase/rewardAdmin";
import { isLocalRewardAdmin } from "@/src/lib/rewards/adminAccess";
import { validateLaunch, validId, campaignStatuses } from "./launchValidation";
export interface CampaignActionState {message:string;id?:string}
function refresh(){for(const p of ["/","/challenges","/admin/campaigns","/activities"])revalidatePath(p);}
export async function launchCampaign(_previous:CampaignActionState,form:FormData):Promise<CampaignActionState>{
 if(!await isLocalRewardAdmin())return {message:"Campaign creation is available only in the local demo."};
 try{
 const keys=[...form.keys()].filter(k=>!k.startsWith("$ACTION_"));const payload=form.get("payload");
 if(keys.length!==1||keys[0]!=="payload"||typeof payload!=="string"||payload.length>16000)throw new Error("Invalid campaign submission.");
 const {campaign,rules}=validateLaunch(JSON.parse(payload));
 const {data,error}=await getRewardAdminClient().rpc("create_sponsor_campaign",{p_campaign:campaign,p_rules:rules});
 if(error)return {message:"Campaign not created. Check organisation, rules and migration setup."};
 refresh();return {message:"Campaign created. BKNE pool is simulated; no funds were transferred.",id:data};
 }catch(error){return {message:error instanceof SyntaxError?"Invalid campaign submission.":error instanceof Error?error.message:"Campaign creation failed."};}
}
export async function campaignCommand(_previous:CampaignActionState,form:FormData):Promise<CampaignActionState>{
 if(!await isLocalRewardAdmin())return {message:"This action is available only in the local demo."};
 const command=form.get("command"),campaignId=form.get("campaignId"),activityId=form.get("activityId"),status=form.get("status");
 const keys=[...form.keys()].filter(k=>!k.startsWith("$ACTION_"));
 const allowed=command==="assign"?["command","campaignId","activityId"]:command==="status"?["command","campaignId","status"]:["command","campaignId"];
 if(!validId(campaignId)||keys.length!==allowed.length||keys.some(k=>!allowed.includes(k)))return {message:"Invalid campaign request."};
 let rpc:string,args:Record<string,string>;
 if(command==="join"){rpc="join_demo_campaign";args={p_campaign_id:campaignId};}
 else if(command==="assign"&&validId(activityId)){rpc="assign_demo_activity_campaign";args={p_campaign_id:campaignId,p_activity_id:activityId};}
 else if(command==="status"&&campaignStatuses.includes(status as typeof campaignStatuses[number])){rpc="set_sponsor_campaign_status";args={p_campaign_id:campaignId,p_status:String(status)};}
 else return {message:"Invalid action."};
 const {error}=await getRewardAdminClient().rpc(rpc,args);
 if(error)return {message:command==="assign"?"Assignment refused. Join an open challenge with a matching rule, and select a demo activity without an existing reward.":command==="join"?"Unable to join. Check challenge dates, audience eligibility and database setup.":"Unable to update campaign status."};
 refresh();revalidatePath("/admin/campaigns/"+campaignId);if(typeof activityId==="string")revalidatePath("/activities/"+activityId);
 return {message:command==="join"?"Joined":command==="assign"?"Campaign assigned.":"Campaign status updated."};
}
