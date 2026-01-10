import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "../types/supabase";

// Custom storage adapter for React Native using expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

let supabaseInstance: SupabaseClient<Database> | null = null;

export const createClient = (
  url: string,
  anonKey: string
): SupabaseClient<Database> => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createSupabaseClient<Database>(url, anonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
};

export const getClient = (): SupabaseClient<Database> | null => supabaseInstance;
