import { supabase } from "@/src/lib/supabase/client";
import { mapActivity } from "./activity";

export async function getActivities(limit?: number) {
  let query = supabase.from("activities").select("*").order("created_at", { ascending: false }).order("id", { ascending: false });
  if (limit !== undefined) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error("Supabase activities read failed:", error.code, error.message);
    throw new Error("Unable to load activities from Supabase.");
  }
  return (data ?? []).map(mapActivity);
}

export async function getActivity(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Supabase activity read failed:", error.code, error.message);
    throw new Error("Unable to load the activity from Supabase.");
  }
  return data ? mapActivity(data) : null;
}
