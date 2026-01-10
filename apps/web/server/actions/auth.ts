"use server";

import { createClient } from "@/lib/supabase/server";
import {
  signUpUser,
  signInUser,
  signOutUser,
} from "@project/core/auth";
import type { SignUpData, SignInData } from "@project/core/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Re-export types for use in components
export type { SignUpData, SignInData } from "@project/core/auth";

export async function signUp(data: SignUpData) {
  const supabase = await createClient();
  const result = await signUpUser(supabase, data);

  if (result.success) {
    revalidatePath("/", "layout");
  }

  return result;
}

export async function signIn(data: SignInData) {
  const supabase = await createClient();
  const result = await signInUser(supabase, data);

  if (result.success) {
    revalidatePath("/", "layout");
  }

  return result;
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const result = await signOutUser(supabase);

  if (result.success) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  // If we get here, there was an error, but we still redirect
  // since form actions can't easily show errors
  redirect("/");
}
