"use server";

import { createClient } from "@/lib/supabase/server";
import { sendOTP, verifyOTP, signOutUser } from "@project/core/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function requestSignInOTP(email: string) {
  const supabase = await createClient();
  return await sendOTP(supabase, email);
}

export async function verifySignInOTP(email: string, token: string) {
  const supabase = await createClient();
  const result = await verifyOTP(supabase, email, token);

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

  redirect("/");
}
