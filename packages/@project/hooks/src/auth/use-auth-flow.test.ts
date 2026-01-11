import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthFlow, type UseAuthFlowOptions } from "./use-auth-flow";

describe("useAuthFlow", () => {
  const mockOnRequestOTP = vi.fn();
  const mockOnVerifyOTP = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  const defaultOptions: UseAuthFlowOptions = {
    onRequestOTP: mockOnRequestOTP,
    onVerifyOTP: mockOnVerifyOTP,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRequestOTP.mockResolvedValue({ success: true });
    mockOnVerifyOTP.mockResolvedValue({ success: true });
  });

  it("starts in email step", () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));
    expect(result.current.step).toBe("email");
  });

  it("initializes with empty email and token", () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));
    expect(result.current.email).toBe("");
    expect(result.current.token).toBe("");
  });

  it("shows default placeholders when not focused", () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));
    expect(result.current.emailPlaceholder).toBe("Enter your email address");
    expect(result.current.otpPlaceholder).toBe("123456");
  });

  it("hides email placeholder when focused", () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmailFocused(true);
    });

    expect(result.current.emailPlaceholder).toBe("");
  });

  it("hides OTP placeholder when focused", () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setOtpFocused(true);
    });

    expect(result.current.otpPlaceholder).toBe("");
  });

  it("validates email before requesting OTP", async () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("invalid");
    });

    await act(async () => {
      await result.current.handleRequestOTP();
    });

    expect(mockOnError).toHaveBeenCalledWith(
      "Please enter a valid email address"
    );
    expect(mockOnRequestOTP).not.toHaveBeenCalled();
  });

  it("transitions to OTP step on successful request", async () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("test@example.com");
    });

    await act(async () => {
      await result.current.handleRequestOTP();
    });

    expect(result.current.step).toBe("otp");
    expect(mockOnRequestOTP).toHaveBeenCalledWith("test@example.com");
  });

  it("calls onError when OTP request fails", async () => {
    mockOnRequestOTP.mockResolvedValue({ error: "Network error" });
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("test@example.com");
    });

    await act(async () => {
      await result.current.handleRequestOTP();
    });

    expect(result.current.step).toBe("email");
    expect(mockOnError).toHaveBeenCalledWith("Network error");
  });

  it("auto-submits when 6 digits entered", async () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    // First get to OTP step
    act(() => {
      result.current.setEmail("test@example.com");
    });
    await act(async () => {
      await result.current.handleRequestOTP();
    });

    // Now enter 6 digits
    await act(async () => {
      result.current.setToken("123456");
      // Allow microtasks to complete
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockOnVerifyOTP).toHaveBeenCalledWith("test@example.com", "123456");
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("validates OTP is 6 digits", async () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    // Get to OTP step
    act(() => {
      result.current.setEmail("test@example.com");
    });
    await act(async () => {
      await result.current.handleRequestOTP();
    });

    // Try to verify with invalid OTP
    act(() => {
      result.current.setToken("12345"); // Only 5 digits
    });
    await act(async () => {
      await result.current.handleVerifyOTP();
    });

    expect(mockOnError).toHaveBeenCalledWith("Code must be 6 digits");
    expect(mockOnVerifyOTP).not.toHaveBeenCalled();
  });

  it("calls onSuccess on successful verification", async () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("test@example.com");
    });
    await act(async () => {
      await result.current.handleRequestOTP();
    });

    act(() => {
      result.current.setToken("123456");
    });
    await act(async () => {
      await result.current.handleVerifyOTP();
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("calls onError on verification failure", async () => {
    mockOnVerifyOTP.mockResolvedValue({ error: "Invalid code" });
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("test@example.com");
    });
    await act(async () => {
      await result.current.handleRequestOTP();
    });

    act(() => {
      result.current.setToken("123456");
    });
    await act(async () => {
      await result.current.handleVerifyOTP();
    });

    expect(mockOnError).toHaveBeenCalledWith("Invalid code");
  });

  it("resets token when going back to email", async () => {
    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("test@example.com");
    });
    await act(async () => {
      await result.current.handleRequestOTP();
    });

    act(() => {
      result.current.setToken("123");
    });

    expect(result.current.token).toBe("123");

    act(() => {
      result.current.handleBackToEmail();
    });

    expect(result.current.step).toBe("email");
    expect(result.current.token).toBe("");
  });

  it("supports custom placeholder text", () => {
    const { result } = renderHook(() =>
      useAuthFlow({
        ...defaultOptions,
        emailPlaceholderText: "Custom email",
        otpPlaceholderText: "Custom OTP",
      })
    );

    expect(result.current.emailPlaceholder).toBe("Custom email");
    expect(result.current.otpPlaceholder).toBe("Custom OTP");
  });

  it("manages loading state during OTP request", async () => {
    let resolveRequest: (value: { success: boolean }) => void;
    mockOnRequestOTP.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { result } = renderHook(() => useAuthFlow(defaultOptions));

    act(() => {
      result.current.setEmail("test@example.com");
    });

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.handleRequestOTP();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveRequest!({ success: true });
    });

    expect(result.current.loading).toBe(false);
  });
});
