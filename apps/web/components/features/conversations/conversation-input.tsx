"use client";

import * as React from "react";
import { Mic, Trash2, Send, Play } from "lucide-react";
import { Card } from "@/components/ui/card";

// Static placeholder waveform heights
const WAVEFORM_HEIGHTS = [
  6, 10, 8, 14, 12, 10, 16, 8, 12, 14, 10, 6, 12, 8, 14, 10, 12, 8, 6, 10,
];

type InputState = "resting" | "typing" | "recording" | "recorded";

interface ConversationInputProps {
  onSubmitText?: (text: string) => void;
  onSubmitRecording?: (uri: string, duration: number) => void;
}

export function ConversationInput({
  onSubmitText,
  onSubmitRecording,
}: ConversationInputProps) {
  const [text, setText] = React.useState("");
  const [state, setState] = React.useState<InputState>("resting");
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Determine effective state based on text content
  const effectiveState =
    text.length > 0 && state === "resting" ? "typing" : state;

  // Recording timer simulation (actual recording will be implemented later)
  React.useEffect(() => {
    if (state === "recording") {
      const interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSend = () => {
    if (effectiveState === "typing" && text.trim()) {
      onSubmitText?.(text.trim());
      setText("");
      setState("resting");
    } else if (state === "recorded") {
      // TODO: Submit actual recording
      onSubmitRecording?.("placeholder-uri", recordingDuration);
      setState("resting");
      setRecordingDuration(0);
    }
  };

  const handleMicPress = () => {
    if (state === "resting" || effectiveState === "typing") {
      setState("recording");
      setRecordingDuration(0);
      setText("");
    } else if (state === "recording") {
      // Stop recording
      setState("recorded");
    } else if (state === "recorded") {
      // Start new recording
      setState("recording");
      setRecordingDuration(0);
    }
  };

  const handleDelete = () => {
    setState("resting");
    setRecordingDuration(0);
  };

  const handlePlayback = () => {
    // TODO: Implement playback
    console.log("Play recording");
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        handleSend();
      }
    }
  };

  const hasText = text.trim().length > 0;
  const micIsRed = state === "recording" || state === "recorded";

  // Auto-resize textarea
  const handleTextAreaResize = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  React.useEffect(() => {
    handleTextAreaResize();
  }, [text, handleTextAreaResize]);

  // Render text input with action buttons below (resting/typing states)
  const renderTextInputWithActions = () => (
    <div className="flex flex-col">
      {/* Text input */}
      <div className="px-4 pt-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Dictate or enter a consultation note ..."
          className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          rows={1}
          style={{ minHeight: "24px", maxHeight: "200px", overflow: "auto" }}
        />
      </div>
      {/* Action buttons row */}
      <div className="flex items-center justify-end gap-1 px-3 pb-3 pt-2">
        <button
          onClick={handleMicPress}
          className="p-2 transition-colors hover:opacity-80"
          aria-label="Start recording"
        >
          <Mic size={22} className="text-muted-foreground" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleSend}
          disabled={!hasText}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            hasText
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  // Render recording state (timer + waveform + actions)
  const renderRecording = () => (
    <div className="flex items-center gap-3 p-3">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Delete recording"
      >
        <Trash2 size={20} />
      </button>

      {/* Timer */}
      <span className="text-base font-medium text-foreground w-12">
        {formatDuration(recordingDuration)}
      </span>

      {/* Waveform */}
      <div className="flex flex-1 items-center justify-center gap-0.5">
        {WAVEFORM_HEIGHTS.map((height, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-muted-foreground/40"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleMicPress}
          className="p-2 transition-colors hover:opacity-80"
          aria-label="Stop recording"
        >
          <Mic size={22} className="text-red-500" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleSend}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  // Render recorded state (playback pill + actions)
  const renderRecorded = () => (
    <div className="flex items-center gap-3 p-3">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Delete recording"
      >
        <Trash2 size={20} />
      </button>

      {/* Playback pill */}
      <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
        <button
          onClick={handlePlayback}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
          aria-label="Play recording"
        >
          <Play size={14} fill="white" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-0.5">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-muted-foreground/40"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {formatDuration(recordingDuration)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleMicPress}
          className="p-2 transition-colors hover:opacity-80"
          aria-label="Re-record"
        >
          <Mic size={22} className="text-red-500" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleSend}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <Card
      className="rounded-3xl border-border py-0"
      style={{ boxShadow: "var(--shadow-input)" }}
    >
      {(effectiveState === "resting" || effectiveState === "typing") &&
        renderTextInputWithActions()}
      {state === "recording" && renderRecording()}
      {state === "recorded" && renderRecorded()}
    </Card>
  );
}
