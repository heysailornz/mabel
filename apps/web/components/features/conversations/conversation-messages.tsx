"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConversationMessages } from "@/hooks/use-conversation-messages";
import type {
  ConversationMessage,
  RecordingUploadMetadata,
  RecordingUploadStatus,
} from "@project/core";

interface ConversationMessagesProps {
  conversationId: string;
  initialMessages: ConversationMessage[];
}

function TickStatus({ status }: { status: RecordingUploadStatus }) {
  const isDoubleTick =
    status === "uploaded" || status === "processing" || status === "completed";
  const isBlue = status === "completed";
  const isFailed = status === "failed";
  const isRecording = status === "recording";

  if (isRecording) {
    return (
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      </span>
    );
  }

  if (isFailed) {
    return (
      <span className="flex items-center gap-1 text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs">Retry</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center",
        isBlue ? "text-blue-500" : "text-muted-foreground"
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
      {isDoubleTick && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 -ml-2"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  );
}

// Static placeholder waveform heights for recording bubbles
const RECORDING_WAVEFORM_HEIGHTS = [10, 14, 12, 18, 16, 14, 20, 12, 16, 18, 14, 10, 16, 12, 18];

function RecordingBubble({ message }: { message: ConversationMessage }) {
  const metadata = message.metadata as unknown as RecordingUploadMetadata;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-sm rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-0.5">
            {RECORDING_WAVEFORM_HEIGHTS.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-muted-foreground/40 rounded-full"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white"
            aria-label="Play recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 ml-0.5"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </button>
        </div>
        {metadata?.duration_seconds && (
          <div className="mt-2 text-xs text-muted-foreground">
            {Math.floor(metadata.duration_seconds / 60)}:
            {String(metadata.duration_seconds % 60).padStart(2, "0")}
          </div>
        )}
      </div>
      <TickStatus status={metadata?.status || "pending"} />
    </div>
  );
}

function TranscriptionBubble({ message }: { message: ConversationMessage }) {
  return (
    <div className="max-w-2xl space-y-3">
      <div className="font-serif text-base text-foreground whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

function SuggestionBubble({ message }: { message: ConversationMessage }) {
  return (
    <div className="max-w-2xl space-y-2">
      <div className="font-serif text-base text-foreground">{message.content}</div>
    </div>
  );
}

function SystemMessage({ message }: { message: ConversationMessage }) {
  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
        {message.content}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isPractitioner = message.participant_type === "practitioner";
  const isSystem = message.participant_type === "system";

  if (isSystem) {
    return <SystemMessage message={message} />;
  }

  if (isPractitioner && message.message_type === "recording_upload") {
    return (
      <div className="flex justify-end">
        <RecordingBubble message={message} />
      </div>
    );
  }

  if (message.message_type === "transcription_result") {
    return (
      <div className="flex justify-start">
        <TranscriptionBubble message={message} />
      </div>
    );
  }

  if (message.message_type === "suggestion") {
    return (
      <div className="flex justify-start">
        <SuggestionBubble message={message} />
      </div>
    );
  }

  return (
    <div
      className={cn("flex", isPractitioner ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-md rounded-2xl px-4 py-2 text-sm",
          isPractitioner
            ? "bg-primary text-primary-foreground"
            : "text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ConversationMessages({
  conversationId,
  initialMessages,
}: ConversationMessagesProps) {
  const { messages } = useConversationMessages({
    conversationId,
    initialMessages,
  });
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
