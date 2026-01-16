import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState, useEffect, useRef, useCallback } from "react";

// Test the input logic extracted from ConversationInput
// Since the component has complex RN dependencies, we test the core logic

type InputState = "resting" | "typing" | "recording" | "recorded";

function useConversationInputLogic(initialMode: "text" | "recording") {
  const [text, setText] = useState("");
  const [state, setState] = useState<InputState>(
    initialMode === "recording" ? "recording" : "resting"
  );
  const [recordingDuration, setRecordingDuration] = useState(0);

  const effectiveState =
    text.length > 0 && state === "resting" ? "typing" : state;

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
  }, []);

  const canSubmitText = effectiveState === "typing" && text.trim().length > 0;
  const canSubmitRecording = state === "recorded";

  const handleSubmitText = useCallback(() => {
    if (canSubmitText) {
      const trimmedText = text.trim();
      setText("");
      setState("resting");
      return trimmedText;
    }
    return null;
  }, [canSubmitText, text]);

  const handleMicPress = useCallback(() => {
    if (state === "resting" || effectiveState === "typing") {
      setState("recording");
      setRecordingDuration(0);
      setText("");
    } else if (state === "recording") {
      setState("recorded");
    } else if (state === "recorded") {
      setState("recording");
      setRecordingDuration(0);
    }
  }, [state, effectiveState]);

  const handleDelete = useCallback(() => {
    setState("resting");
    setRecordingDuration(0);
  }, []);

  const incrementDuration = useCallback(() => {
    setRecordingDuration((prev) => prev + 1);
  }, []);

  return {
    text,
    state,
    effectiveState,
    recordingDuration,
    formatDuration,
    handleTextChange,
    handleSubmitText,
    handleMicPress,
    handleDelete,
    incrementDuration,
    canSubmitText,
    canSubmitRecording,
  };
}

describe("ConversationInput Logic", () => {
  describe("Text Input Mode", () => {
    it("starts in resting state when initialMode is text", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.state).toBe("resting");
      expect(result.current.effectiveState).toBe("resting");
    });

    it("initializes with empty text", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.text).toBe("");
    });

    it("updates text when handleTextChange is called", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("Hello world");
      });

      expect(result.current.text).toBe("Hello world");
    });

    it("transitions to typing state when text is entered", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("Some text");
      });

      expect(result.current.effectiveState).toBe("typing");
    });

    it("returns trimmed text on submit", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("  Hello world  ");
      });

      let submittedText: string | null = null;
      act(() => {
        submittedText = result.current.handleSubmitText();
      });

      expect(submittedText).toBe("Hello world");
    });

    it("clears text after submission", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("Hello world");
      });

      act(() => {
        result.current.handleSubmitText();
      });

      expect(result.current.text).toBe("");
      expect(result.current.state).toBe("resting");
    });

    it("returns null when trying to submit empty text", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("   ");
      });

      let submittedText: string | null = null;
      act(() => {
        submittedText = result.current.handleSubmitText();
      });

      expect(submittedText).toBeNull();
    });

    it("does not allow submission when text is empty", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      expect(result.current.canSubmitText).toBe(false);
    });

    it("allows submission when text is entered", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("Hello");
      });

      expect(result.current.canSubmitText).toBe(true);
    });
  });

  describe("Recording Mode", () => {
    it("starts in recording state when initialMode is recording", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));
      expect(result.current.state).toBe("recording");
    });

    it("initializes with zero duration", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));
      expect(result.current.recordingDuration).toBe(0);
    });

    it("increments recording duration", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));

      act(() => {
        result.current.incrementDuration();
      });

      expect(result.current.recordingDuration).toBe(1);
    });

    it("stops recording on mic press", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));

      act(() => {
        result.current.handleMicPress();
      });

      expect(result.current.state).toBe("recorded");
    });

    it("can submit recording when in recorded state", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));

      act(() => {
        result.current.handleMicPress(); // Stop recording
      });

      expect(result.current.canSubmitRecording).toBe(true);
    });

    it("resets to resting on delete", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));

      act(() => {
        result.current.incrementDuration();
        result.current.incrementDuration();
      });

      act(() => {
        result.current.handleDelete();
      });

      expect(result.current.state).toBe("resting");
      expect(result.current.recordingDuration).toBe(0);
    });
  });

  describe("State Transitions", () => {
    it("transitions from resting to recording on mic press", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleMicPress();
      });

      expect(result.current.state).toBe("recording");
    });

    it("clears text when switching to recording mode", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));

      act(() => {
        result.current.handleTextChange("Some text");
      });

      act(() => {
        result.current.handleMicPress();
      });

      expect(result.current.text).toBe("");
    });

    it("restarts recording from recorded state on mic press", () => {
      const { result } = renderHook(() => useConversationInputLogic("recording"));

      // Stop recording
      act(() => {
        result.current.incrementDuration();
        result.current.incrementDuration();
        result.current.handleMicPress();
      });

      expect(result.current.state).toBe("recorded");
      expect(result.current.recordingDuration).toBe(2);

      // Restart recording
      act(() => {
        result.current.handleMicPress();
      });

      expect(result.current.state).toBe("recording");
      expect(result.current.recordingDuration).toBe(0);
    });
  });

  describe("Duration Formatting", () => {
    it("formats 0 seconds as 0:00", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.formatDuration(0)).toBe("0:00");
    });

    it("formats 5 seconds as 0:05", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.formatDuration(5)).toBe("0:05");
    });

    it("formats 65 seconds as 1:05", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.formatDuration(65)).toBe("1:05");
    });

    it("formats 125 seconds as 2:05", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.formatDuration(125)).toBe("2:05");
    });

    it("formats 600 seconds as 10:00", () => {
      const { result } = renderHook(() => useConversationInputLogic("text"));
      expect(result.current.formatDuration(600)).toBe("10:00");
    });
  });
});
