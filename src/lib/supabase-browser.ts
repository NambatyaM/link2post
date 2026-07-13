"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const isValidUrl = url.startsWith("http://") || url.startsWith("https://");
  const isValidKey = key.length > 20 && !key.startsWith("your-");

  if (!isValidUrl || !isValidKey) {
    client = createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return client;
  }

  client = createClient(url, key);
  return client;
}
