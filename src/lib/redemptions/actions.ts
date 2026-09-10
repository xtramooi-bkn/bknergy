"use server";
import {revalidatePath} from "next/cache";
import {isLocalRewardAdmin} from "@/src/lib/rewards/adminAccess";
import {getRewardAdminClient} from "@/src/lib/supabase/rewardAdmin";
import {validId} from "@/src/lib/campaigns/launchValidation";
import {validateRedemption} from "./validation";
import type {RedemptionRecord} from "./types";
export interface RedemptionState {message:string;redemption?:RedemptionRecord}
export async function requestRedemption(_previous:RedemptionState,form:FormData):Promise<RedemptionState>{
 if(!await isLocalRewardAdmin())return {message:"Redemption requests are available only in the local demo."};
 let input;try{input=validateRedemption(form);}catch(error){return {message:error instanceof Error?error.message:"Invalid redemption request."};}
 const {data,error}=await getRewardAdminClient().rpc("request_demo_redemption",{p_campaign_id:input.campaignId,p_request_id:input.requestId,p_amount_bkne:input.amount,p_type:input.type,p_destination:input.destination});
 if(error||!data)return {message:"Request refused. Check distributed balance and campaign conversion value. A request ID cannot be reused for different selections; reload to start a new request."};
 revalidatePath("/rewards");revalidatePath("/");revalidatePath("/challenges");
 return {message:input.type==="hold"?"Preference saved. Your BKNE remains available.":"Redemption requested. No payout, donation or voucher delivery has occurred.",redemption:data as RedemptionRecord};
}
export async function setRedemptionValue(_previous:{message:string},form:FormData){
 if(!await isLocalRewardAdmin())return {message:"Available only in the local demo."};
 const keys=[...form.keys()].filter(k=>!k.startsWith("$ACTION_"));const id=form.get("campaignId"),raw=form.get("bknePerEur");
 if(keys.length!==2||keys.some(k=>!["campaignId","bknePerEur"].includes(k))||!validId(id)||typeof raw!=="string")return {message:"Invalid conversion setting."};
 const rate=raw.trim()===""?null:Number(raw);if(rate!==null&&(!Number.isFinite(rate)||rate<=0||rate>Number.MAX_SAFE_INTEGER))return {message:"Enter a positive BKNE amount per EUR, or leave blank."};
 const {error}=await getRewardAdminClient().rpc("set_campaign_redemption_value",{p_campaign_id:id,p_bkne_per_eur:rate});
 if(error)return {message:"Unable to save conversion setting. Check migration setup."};
 revalidatePath("/admin/campaigns/"+id);revalidatePath("/rewards");return {message:"Campaign-funded reward value saved. Existing requests retain their original value."};
}
