import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local (or your deployment environment) and restart the application.",
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local (or your deployment environment) and restart the application. Use the public publishable key, never a secret or service-role key.",
  );
}

/** Shared client configured only with browser-safe public environment variables. */
export const supabase = createClient(supabaseUrl.replace(/\/rest\/v1\/?$/, ""), supabasePublishableKey);
