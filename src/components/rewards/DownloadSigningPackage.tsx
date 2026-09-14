"use client";
import { useState } from "react";
import { getRewardSigningPackageAction } from "@/src/lib/rewards/brickkenDistributionActions";

export default function DownloadSigningPackage({ rewardId, amount }: { rewardId: string; amount: number }) {
  const [message, setMessage] = useState("");
  async function download() {
    setMessage("");
    try {
      const preparation = await getRewardSigningPackageAction(rewardId);
      const blob = new Blob([JSON.stringify(preparation, null, 2) + "\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `bknergy-reward-${amount}-${rewardId}-preparation.json`; link.click(); URL.revokeObjectURL(url);
      setMessage("Signing package downloaded. It contains no keys or secrets.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Package download failed."); }
  }
  return <div className="space-y-2"><button type="button" onClick={download} className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white">Download signing package</button>{message && <p role="status" className="text-xs text-slate-500">{message}</p>}</div>;
}
