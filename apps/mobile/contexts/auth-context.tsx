import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  sendOTP,
  verifyOTP,
  signOutUser,
  getCurrentUser,
} from "@project/core/auth";
import type { AuthResult } from "@project/core/auth";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  requestOTP: (email: string) => Promise<AuthResult>;
  verifyOTP: (email: string, token: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount
    getCurrentUser(supabase)
      .then(setUser)
      .finally(() => setLoading(false));

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const requestOTPHandler = async (email: string) => {
    return await sendOTP(supabase, email);
  };

  const verifyOTPHandler = async (email: string, token: string) => {
    return await verifyOTP(supabase, email, token);
  };

  const signOutHandler = async () => {
    return await signOutUser(supabase);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        requestOTP: requestOTPHandler,
        verifyOTP: verifyOTPHandler,
        signOut: signOutHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
