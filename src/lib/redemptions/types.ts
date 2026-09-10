export const redemptionOptions = {
 cash: {label:"Cash reward / EUR", destinations:[{id:"demo_cash",label:"Demo cash reward"}]},
 donation: {label:"Donate to charity",destinations:[{id:"demo_youth_sport",label:"Youth sport charity (demo)"},{id:"demo_community_health",label:"Community health charity (demo)"},{id:"demo_active_access",label:"Accessible activity charity (demo)"}]},
 partner_store: {label:"Partner store",destinations:[{id:"sports_voucher",label:"Sports voucher"},{id:"healthy_lunch_voucher",label:"Healthy lunch voucher"},{id:"race_entry",label:"Race entry"}]},
 wellness: {label:"Sports & wellness rewards",destinations:[{id:"gym_contribution",label:"Gym contribution"},{id:"sports_voucher",label:"Sports voucher"},{id:"race_entry",label:"Race entry"}]},
 hold: {label:"Keep BKNE",destinations:[{id:"keep_bkne",label:"Keep my balance available"}]},
} as const;
export type RedemptionType=keyof typeof redemptionOptions;
export type RedemptionStatus="requested"|"processing"|"completed"|"failed";
export interface RedemptionRecord {id:string;user_id:string;campaign_id:string;request_id:string;amount_bkne:number;redemption_type:RedemptionType;destination:string;euro_value:number|null;conversion_bkne_per_eur:number|null;status:RedemptionStatus;created_at:string}
export interface RewardTotals {earned:number;pending:number;processing:number;failed:number;distributed:number}
export interface CampaignEarnings extends RewardTotals {campaign_id:string;redemption_bkne_per_eur:number|null;available:number;committed:number;rewarded_activities:number;activity_count:number;distance_meters:number;active_minutes:number;steps:number}
export interface RewardOverview {totals:RewardTotals;available:number;campaigns:CampaignEarnings[];redemptions:RedemptionRecord[]}
export interface RedemptionProvider {fulfill(redemption:RedemptionRecord):Promise<{status:"not_connected"}|{status:"completed";reference:string}|{status:"failed"}>}
