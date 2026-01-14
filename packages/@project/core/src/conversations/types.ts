import type { Database } from "@project/db/types";

// Base types from database
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationMessage = Database["public"]["Tables"]["conversation_messages"]["Row"];
export type ConversationMessageInsert = Database["public"]["Tables"]["conversation_messages"]["Insert"];

// Participant types
export const PARTICIPANT_TYPES = [
  "practitioner",
  "transcription_ai",
  "suggestions_ai",
  "summary_ai",
  "system",
] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

// Message types
export const MESSAGE_TYPES = [
  "recording_upload",
  "transcription_result",
  "suggestion",
  "summary",
  "user_edit",
  "accepted_suggestion",
  "status_update",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

// Recording upload status (for tick indicator)
export const RECORDING_UPLOAD_STATUSES = [
  "recording",
  "local_saved",
  "uploading",
  "uploaded",
  "processing",
  "completed",
  "failed",
] as const;
export type RecordingUploadStatus = (typeof RECORDING_UPLOAD_STATUSES)[number];

// Metadata types for each message type
export interface RecordingUploadMetadata {
  recording_id: string;
  duration_seconds: number;
  status: RecordingUploadStatus;
  upload_progress?: number; // 0-100, only during upload
  error_message?: string; // Only on failure
}

export interface TranscriptionResultMetadata {
  recording_id: string;
  transcript_id: string;
  raw_text: string;
  word_count: number;
  confidence: number;
}

export interface SuggestionItem {
  id: string;
  type: "missing_element";
  element: string;
  message: string;
  suggested_text: string;
  status: "pending" | "accepted" | "dismissed";
}

export interface SuggestionMetadata {
  recording_id: string;
  suggestions: SuggestionItem[];
}

export interface SummaryMetadata {
  recording_id: string;
}

export interface UserEditMetadata {
  recording_id: string;
  transcript_id: string;
  original_text: string;
  edit_summary?: string;
}

export interface AcceptedSuggestionMetadata {
  suggestion_message_id: string;
  suggestion_id: string;
  applied_text: string;
}

export interface StatusUpdateMetadata {
  recording_id?: string;
  status: "info" | "warning" | "error";
  action?: {
    label: string;
    type: "retry_upload" | "retry_processing";
  };
}

// Union type for all metadata
export type MessageMetadata =
  | RecordingUploadMetadata
  | TranscriptionResultMetadata
  | SuggestionMetadata
  | SummaryMetadata
  | UserEditMetadata
  | AcceptedSuggestionMetadata
  | StatusUpdateMetadata;

// Typed message variants
export interface RecordingUploadMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "practitioner";
  message_type: "recording_upload";
  metadata: RecordingUploadMetadata;
}

export interface TranscriptionResultMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "transcription_ai";
  message_type: "transcription_result";
  metadata: TranscriptionResultMetadata;
}

export interface SuggestionMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "suggestions_ai";
  message_type: "suggestion";
  metadata: SuggestionMetadata;
}

export interface SummaryMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "summary_ai";
  message_type: "summary";
  metadata: SummaryMetadata;
}

export interface UserEditMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "practitioner";
  message_type: "user_edit";
  metadata: UserEditMetadata;
}

export interface AcceptedSuggestionMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "practitioner";
  message_type: "accepted_suggestion";
  metadata: AcceptedSuggestionMetadata;
}

export interface StatusUpdateMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "system";
  message_type: "status_update";
  metadata: StatusUpdateMetadata;
}

// Discriminated union of all message types
export type TypedConversationMessage =
  | RecordingUploadMessage
  | TranscriptionResultMessage
  | SuggestionMessage
  | SummaryMessage
  | UserEditMessage
  | AcceptedSuggestionMessage
  | StatusUpdateMessage;

// Conversation with last message for list display
export interface ConversationWithPreview extends Conversation {
  last_message?: ConversationMessage;
  message_count: number;
}

// Time-based greeting helper
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning!";
  if (hour >= 12 && hour < 17) return "Good afternoon!";
  if (hour >= 17 && hour < 21) return "Good evening!";
  return "Working late?";
}
