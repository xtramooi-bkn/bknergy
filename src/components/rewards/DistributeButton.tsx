"use client";
import { useActionState } from "react";
import { requestDistribution } from "@/src/lib/rewards/distributionActions";
export default function DistributeButton({rewardId,retry}:{rewardId:string;retry:boolean}) {
 const [state,action,pending]=useActionState(requestDistribution,{message:""});
 return <form action={action} className="mt-4"><input type="hidden" name="rewardId" value={rewardId}/><button disabled={pending} className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white disabled:opacity-50">{pending?"Processing…":retry?"Retry distribution":"Distribute"}</button><p role="status" className="mt-2 text-sm">{state.message}</p></form>;
}
