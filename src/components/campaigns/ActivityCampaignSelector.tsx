import {isLocalRewardAdmin} from "@/src/lib/rewards/adminAccess";
import {getSponsorCatalog,availableCampaigns} from "@/src/lib/campaigns/sponsorQueries";
import {getRewardForActivity} from "@/src/lib/rewards/getRewardForActivity";
import type {Activity} from "@/src/lib/activities/activity";
import CampaignCommandForm from "./CampaignCommandForm";
export default async function ActivityCampaignSelector({activity}:{activity:Activity}){
 if(!activity.isDemo||!await isLocalRewardAdmin())return null;
 let reward;let catalog;
 try{reward=await getRewardForActivity(activity.id);catalog=await getSponsorCatalog();}catch{return <p className="mt-4 text-xs text-amber-800">Campaign assignment unavailable. Check campaign migration setup.</p>;}
 if(reward)return <p className="mt-5 text-xs text-slate-500">Campaign assignment is locked because this activity already has a reward.</p>;
 const choices=availableCampaigns(catalog).filter(c=>catalog.participants.some(p=>p.campaign_id===c.id&&p.user_id===catalog.userId&&p.status==="active")&&catalog.rules.some(r=>r.campaign_id===c.id&&r.activity_type===activity.type));
 return <section className="panel mt-5 p-4"><h2 className="font-semibold">Assign demo activity to a joined challenge</h2>{choices.length?<CampaignCommandForm command="assign" activityId={activity.id} choices={choices} currentCampaignId={activity.campaignId}/>:<p className="mt-2 text-sm">Join a challenge with a rule for this activity first.</p>}</section>;

}
