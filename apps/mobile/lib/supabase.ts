import Constants from "expo-constants";
import { createClient } from "@project/db/mobile";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration in app.config.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
