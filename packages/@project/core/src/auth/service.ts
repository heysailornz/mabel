import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignUpData, SignInData, AuthResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Core auth service - platform agnostic
 * Accepts a Supabase client from the caller (web or mobile)
 */
export async function signUpUser(
  supabase: AnySupabaseClient,
  data: SignUpData
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signInUser(
  supabase: AnySupabaseClient,
  data: SignInData
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOutUser(
  supabase: AnySupabaseClient
): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getCurrentUser(supabase: AnySupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
