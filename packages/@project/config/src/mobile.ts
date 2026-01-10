import { z } from "zod";

export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type MobileEnv = z.infer<typeof mobileEnvSchema>;
