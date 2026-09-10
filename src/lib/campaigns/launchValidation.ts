export const campaignStatuses=["draft","active","completed","paused"] as const;
export const audiences=["public","employees","invite_only","community"] as const;
export const activityTypes=["running","walking","cycling","workout"] as const;
export const launchMetrics=["distance_km","active_minutes","steps","activity_count"] as const;
export interface LaunchRule {activity_type:string;metric:string;threshold:number;reward_amount:number;max_reward:number|null}
export interface LaunchCampaign {organisation_id:string;name:string;description:string;start_date:string;end_date:string;reward_pool:number;status:string;audience:string;max_reward_per_participant:number|null;max_reward_per_day:number|null}
export function validId(value:unknown):value is string{return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function validateLaunch(input:unknown):{campaign:LaunchCampaign;rules:LaunchRule[]} {
 if(!input || typeof input!=="object" || Array.isArray(input)) throw new Error("Invalid campaign submission.");
 const obj=input as Record<string,unknown>;
 if(Object.keys(obj).some(k=>k!=="campaign"&&k!=="rules") || !obj.campaign || typeof obj.campaign!=="object" || Array.isArray(obj.campaign)) throw new Error("Invalid campaign fields.");
 const c=obj.campaign as Record<string,unknown>;
 const allowed=["organisation_id","name","description","start_date","end_date","reward_pool","status","audience","max_reward_per_participant","max_reward_per_day"];
 if(Object.keys(c).some(k=>!allowed.includes(k))) throw new Error("Unexpected campaign field. Remaining pool is calculated by the server.");
 const number=(v:unknown,label:string,positive=false)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<0||v>Number.MAX_SAFE_INTEGER||(positive&&v===0))throw new Error("Invalid "+label+".");return v;};
 const cap=(v:unknown)=>v==null?null:number(v,"reward cap");
 const date=(v:unknown)=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw new Error("Use valid campaign dates.");return v;};
 if(!validId(c.organisation_id))throw new Error("Select an organisation.");
 if(typeof c.name!=="string"||!c.name.trim()||c.name.trim().length>120||typeof c.description!=="string"||c.description.length>2000)throw new Error("Use a name up to 120 characters and description up to 2,000 characters.");
 if(!campaignStatuses.includes(c.status as typeof campaignStatuses[number])||!audiences.includes(c.audience as typeof audiences[number]))throw new Error("Invalid status or audience.");
 const start=date(c.start_date),end=date(c.end_date);if(end<start)throw new Error("End date must follow the start date.");
 const pool=number(c.reward_pool,"reward pool",true);if(!Number.isSafeInteger(pool))throw new Error("Use whole BKNE for the reward pool.");
 if(!Array.isArray(obj.rules)||obj.rules.length<1||obj.rules.length>4)throw new Error("Add between one and four rules.");
 const seen=new Set<string>();
 const rules=obj.rules.map((raw:unknown)=>{if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid rule.");const r=raw as Record<string,unknown>;
 if(Object.keys(r).some(k=>!["activity_type","metric","threshold","reward_amount","max_reward"].includes(k))||!activityTypes.includes(r.activity_type as typeof activityTypes[number])||!launchMetrics.includes(r.metric as typeof launchMetrics[number]))throw new Error("Invalid activity or metric.");
 const type=String(r.activity_type);if(seen.has(type))throw new Error("Use one rule per activity type.");seen.add(type);
 return {activity_type:type,metric:String(r.metric),threshold:number(r.threshold,"threshold",true),reward_amount:number(r.reward_amount,"reward amount"),max_reward:cap(r.max_reward)};});
 return {campaign:{organisation_id:c.organisation_id,name:c.name.trim(),description:c.description,start_date:start,end_date:end,reward_pool:pool,status:String(c.status),audience:String(c.audience),max_reward_per_participant:cap(c.max_reward_per_participant),max_reward_per_day:cap(c.max_reward_per_day)},rules};
}
