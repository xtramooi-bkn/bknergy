"use server";
import { revalidatePath } from "next/cache";
import { isLocalRewardAdmin } from "./adminAccess";
import { processRewardDistribution } from "./processRewardDistribution";
export async function requestDistribution(_previous:{message:string},formData:FormData) {
 if(!await isLocalRewardAdmin()) return {message:"Admin distribution is available only in the local demo."};
 const keys=[...formData.keys()].filter(k=>!k.startsWith("$ACTION_"));
 const id=formData.get("rewardId");
 if(keys.length!==1 || keys[0]!=="rewardId" || typeof id!=="string") return {message:"Send only a reward ID."};
 try {
 const reward=await processRewardDistribution(id);
 revalidatePath("/admin/rewards");revalidatePath("/");revalidatePath("/activities/"+reward.activity_id);
 return {message:reward.last_error ?? "Reward distributed."};
 } catch(error) {return {message:error instanceof Error ? error.message : "Distribution unavailable."};}
}
