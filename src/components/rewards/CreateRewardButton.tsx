"use client";

import { useActionState } from "react";
import { requestActivityReward } from "@/src/lib/rewards/actions";

export default function CreateRewardButton({ activityId }: { activityId: string }) {
  const [state, action, pending] = useActionState(requestActivityReward, { error: "" });
  return <form action={action} className="mt-5"><input type="hidden" name="activityId" value={activityId} /><button type="submit" disabled={pending} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Creating reward…" : "Create reward"}</button>{state.error && <p role="alert" className="mt-3 text-xs text-amber-800">{state.error}</p>}</form>;
}
