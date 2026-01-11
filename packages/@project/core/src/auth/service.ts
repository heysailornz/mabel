import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Send OTP to email
 * Works for both new and existing users
 */
export async function sendOTP(
  supabase: AnySupabaseClient,
  email: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Verify OTP and complete authentication
 */
export async function verifyOTP(
  supabase: AnySupabaseClient,
  email: string,
  token: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Sign out current user
 */
export async function signOutUser(
  supabase: AnySupabaseClient
): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(supabase: AnySupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
