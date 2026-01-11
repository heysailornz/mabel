import { z } from "zod";

// Request OTP
export const requestOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Verify OTP
export const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().length(6, "Code must be 6 digits"),
});

export type RequestOTPData = z.infer<typeof requestOTPSchema>;
export type VerifyOTPData = z.infer<typeof verifyOTPSchema>;

export interface AuthResult {
  success?: boolean;
  error?: string;
}
