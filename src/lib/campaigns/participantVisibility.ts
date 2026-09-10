import {availableCampaigns,type getSponsorCatalog} from "./sponsorQueries";
export function participantCampaignGroups(catalog:Awaited<ReturnType<typeof getSponsorCatalog>>){
 const joined=catalog.campaigns.filter(c=>c.status!=="draft"&&catalog.participants.some(p=>p.campaign_id===c.id&&p.user_id===catalog.userId&&p.status!=="left"));
 const ids=new Set(joined.map(c=>c.id));
 return {joined,available:availableCampaigns(catalog).filter(c=>!ids.has(c.id))};
}
