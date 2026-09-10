import { sourceLabels, type NormalizedActivity } from "@/src/lib/activities/normalizeActivity";
export default function ActivitySourceInfo({ activity }: { activity: NormalizedActivity }) {
  return <div className="text-xs text-slate-500"><p className="font-medium text-slate-700">Activity source</p><p className="mt-1">{sourceLabels[activity.source]}</p>{activity.isDemo && <p className="mt-1">Representative health/activity data</p>}{activity.originalSource && <p className="mt-1 text-[11px]">{activity.originalSource}</p>}{activity.isManual && <p className="mt-1 text-[11px]">Manual-entry scenario</p>}</div>;
}
