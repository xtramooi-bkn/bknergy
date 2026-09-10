import {validId} from "@/src/lib/campaigns/launchValidation";
import {redemptionOptions,type RedemptionType} from "./types";
export function validateRedemption(form:FormData){
 const keys=[...form.keys()].filter(k=>!k.startsWith("$ACTION_"));const fields=["campaignId","requestId","amount","type","destination"];
 if(keys.length!==fields.length||keys.some(k=>!fields.includes(k)))throw new Error("Send only the redemption selection. Balances and euro values are calculated server-side.");
 const campaignId=form.get("campaignId"),requestId=form.get("requestId"),raw=form.get("amount"),type=form.get("type"),destination=form.get("destination");
 if(!validId(campaignId)||!validId(requestId)||typeof raw!=="string"||!raw.trim())throw new Error("Invalid redemption request.");
 const amount=Number(raw);if(!Number.isSafeInteger(amount)||amount<=0)throw new Error("Enter a positive whole BKNE amount.");
 if(typeof type!=="string"||!Object.hasOwn(redemptionOptions,type)||typeof destination!=="string")throw new Error("Select a redemption option.");
 const selected=type as RedemptionType;
 if(!redemptionOptions[selected].destinations.some(d=>d.id===destination))throw new Error("Select an available demo destination.");
 return {campaignId,requestId,amount,type:selected,destination};
}
