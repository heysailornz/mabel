import { useState, useCallback, useRef } from "react";

export interface AuthFlowResult {
  success?: boolean;
  error?: string;
}

export interface UseAuthFlowOptions {
  onRequestOTP: (email: string) => Promise<AuthFlowResult>;
  onVerifyOTP: (email: string, token: string) => Promise<AuthFlowResult>;
  onSuccess: () => void;
  onError: (message: string) => void;
  emailPlaceholderText?: string;
  otpPlaceholderText?: string;
}

export interface UseAuthFlowReturn {
  // State
  step: "email" | "otp";
  email: string;
  token: string;
  loading: boolean;
  emailFocused: boolean;
  otpFocused: boolean;

  // Actions
  setEmail: (value: string) => void;
  setToken: (value: string) => void;
  setEmailFocused: (value: boolean) => void;
  setOtpFocused: (value: boolean) => void;
  handleRequestOTP: () => Promise<void>;
  handleVerifyOTP: () => Promise<void>;
  handleBackToEmail: () => void;

  // Computed
  emailPlaceholder: string;
  otpPlaceholder: string;
}

export function useAuthFlow(options: UseAuthFlowOptions): UseAuthFlowReturn {
  const {
    onRequestOTP,
    onVerifyOTP,
    onSuccess,
    onError,
    emailPlaceholderText = "Enter your email address",
    otpPlaceholderText = "123456",
  } = options;

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [token, setTokenState] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);

  // Ref to prevent double submissions
  const isSubmittingRef = useRef(false);

  const validateEmail = useCallback((emailToValidate: string): boolean => {
    return emailToValidate.includes("@") && emailToValidate.length > 3;
  }, []);

  const validateOTP = useCallback((otpToValidate: string): boolean => {
    return otpToValidate.length === 6 && /^\d+$/.test(otpToValidate);
  }, []);

  const submitOTP = useCallback(
    async (otpToken: string) => {
      if (isSubmittingRef.current || loading) return;

      if (!validateOTP(otpToken)) {
        onError("Code must be 6 digits");
        return;
      }

      isSubmittingRef.current = true;
      setLoading(true);

      try {
        const result = await onVerifyOTP(email, otpToken);

        if (result.error) {
          onError(result.error);
        } else if (result.success) {
          onSuccess();
        }
      } finally {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    },
    [email, loading, onError, onSuccess, onVerifyOTP, validateOTP]
  );

  const setToken = useCallback(
    (value: string) => {
      setTokenState(value);
      // Auto-submit when 6 digits entered
      if (value.length === 6 && !loading && !isSubmittingRef.current) {
        submitOTP(value);
      }
    },
    [loading, submitOTP]
  );

  const handleRequestOTP = useCallback(async () => {
    if (!validateEmail(email)) {
      onError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const result = await onRequestOTP(email);

      if (result.error) {
        onError(result.error);
      } else if (result.success) {
        setStep("otp");
      }
    } finally {
      setLoading(false);
    }
  }, [email, onError, onRequestOTP, validateEmail]);

  const handleVerifyOTP = useCallback(async () => {
    await submitOTP(token);
  }, [submitOTP, token]);

  const handleBackToEmail = useCallback(() => {
    setStep("email");
    setTokenState("");
  }, []);

  return {
    // State
    step,
    email,
    token,
    loading,
    emailFocused,
    otpFocused,

    // Actions
    setEmail,
    setToken,
    setEmailFocused,
    setOtpFocused,
    handleRequestOTP,
    handleVerifyOTP,
    handleBackToEmail,

    // Computed
    emailPlaceholder: emailFocused ? "" : emailPlaceholderText,
    otpPlaceholder: otpFocused ? "" : otpPlaceholderText,
  };
}
