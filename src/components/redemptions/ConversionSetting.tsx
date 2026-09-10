"use client";
import {useActionState} from "react";
import {setRedemptionValue} from "@/src/lib/redemptions/actions";
export default function ConversionSetting({campaignId,rate}:{campaignId:string;rate:number|null}){
 const [state,action,pending]=useActionState(setRedemptionValue,{message:""});
 return <form action={action} className="panel space-y-3 p-5"><h2 className="font-semibold">Campaign-funded reward value</h2><p className="text-xs text-slate-500">A sponsor reward conversion value, not a crypto exchange rate. For example, 100 BKNE = €1. No real funding is collected.</p><input type="hidden" name="campaignId" value={campaignId}/><label className="block text-sm">BKNE per €1 (optional)<input type="number" min="0.000001" step="any" name="bknePerEur" defaultValue={rate??""} placeholder="100" className="mt-1 block rounded border border-slate-300 p-2"/></label><p className="text-xs text-slate-500">Leave blank to disable new cash, donation and voucher requests. Existing requests keep their recorded value.</p><button disabled={pending} className="rounded bg-teal-700 px-3 py-2 text-sm text-white disabled:opacity-50">Save reward value</button><p role="status" className="text-sm">{state.message}</p></form>;
}
