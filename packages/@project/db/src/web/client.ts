import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../types/supabase";

// Re-export Database type for consumers
export type { Database };

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
