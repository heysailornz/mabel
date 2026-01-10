import { z } from "zod";

export const webEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const validateWebEnv = () => webEnvSchema.parse(process.env);
