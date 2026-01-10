import { z } from "zod";

// Base schema shared across all platforms
export const baseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
