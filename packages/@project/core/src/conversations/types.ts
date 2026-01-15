/**
 * Conversation Types
 *
 * Conversations are chat-style threads containing practitioner inputs,
 * AI responses (artifacts, suggestions), and user actions.
 *
 * This uses the generalized skills/artifacts architecture for extensibility.
 */

import type { Database } from "@project/db/types";
import type { InputType, ClassificationIntent, ArtifactType } from "../skills/types";

// =============================================================================
// Base Types from Database
// =============================================================================

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationMessage = Database["public"]["Tables"]["conversation_messages"]["Row"];
export type ConversationMessageInsert = Database["public"]["Tables"]["conversation_messages"]["Insert"];

// =============================================================================
// Participant Types
// =============================================================================

export const PARTICIPANT_TYPES = [
  "practitioner", // The logged-in user
  "transcription_ai", // Deepgram transcription results
  "suggestions_ai", // Claude-generated suggestions
  "summary_ai", // Claude-generated summary
  "assistant_ai", // Conversational AI (instructions, questions, fragments)
  "skill_ai", // Generic skill processor (X-ray, VBG, etc.)
  "system", // Status updates, errors, prompts
] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

// =============================================================================
// Message Types
// =============================================================================

export const MESSAGE_TYPES = [
  // User inputs
  "user_input", // Unified input type (audio, text, image, document)

  // Skill outputs
  "artifact_created", // New artifact from skill processing
  "artifact_updated", // Existing artifact modified

  // Suggestions and summary
  "suggestion", // AI suggestions for missing elements
  "summary", // One-sentence summary

  // User actions
  "user_edit", // User edited an artifact
  "accepted_suggestion", // User accepted a suggestion

  // Assistant interactions
  "instruction_response", // AI response to instruction/question
  "clarification_request", // AI asking for clarification

  // System
  "status_update", // System status messages
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

// =============================================================================
// User Input Message Status (for tick indicator in UI)
// Extends database status with upload-specific states
// =============================================================================

export const USER_INPUT_MESSAGE_STATUSES = [
  "received", // Input received
  "uploading", // File upload in progress
  "classifying", // AI determining intent
  "processing", // Skill processing
  "completed", // Fully processed
  "failed", // Error occurred
] as const;
export type UserInputMessageStatus = (typeof USER_INPUT_MESSAGE_STATUSES)[number];

// =============================================================================
// Metadata Types
// =============================================================================

/**
 * user_input - Unified message type for all user inputs
 */
export interface UserInputMetadata {
  user_input_id: string;
  input_type: InputType;

  // For audio inputs
  recording_id?: string;
  duration_seconds?: number;
  upload_progress?: number; // 0-100 during upload

  // For image/document inputs
  storage_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  thumbnail_url?: string;

  // Classification (from unified classifier)
  classification?: {
    skillId: string;
    intent: ClassificationIntent;
    confidence: number;
    targetArtifactId?: string; // For enrich_existing
  };

  // Status
  status: UserInputMessageStatus;
  error_message?: string;
}

/**
 * artifact_created - When a skill produces a new artifact
 */
export interface ArtifactCreatedMetadata {
  artifact_id: string;
  artifact_type: ArtifactType;
  skill_id: string;
  user_input_id: string;
  summary: string;
  suggestions_count: number;

  // Artifact-specific preview data
  preview?: {
    // For transcript
    word_count?: number;
    confidence?: number;

    // For X-ray
    findings_count?: number;
    primary_finding?: string;
    image_thumbnail?: string;

    // For VBG
    primary_disorder?: string;
    ph?: number;
    pco2?: number;
  };
}

/**
 * artifact_updated - When an existing artifact is modified
 */
export interface ArtifactUpdatedMetadata {
  artifact_id: string;
  artifact_type: ArtifactType;
  update_type: "enriched" | "edited" | "reference_added";
  user_input_id?: string;
  source_artifact_id?: string; // If adding cross-reference

  changes: {
    description: string;
    added_content?: string;
    suggestions_regenerated: boolean;
  };

  new_version: number;
}

/**
 * Suggestion item within a suggestion message
 */
export interface SuggestionItem {
  id: string;
  type: "missing_element" | "clarification" | "enhancement";
  element?: string;
  message: string;
  suggested_text?: string;
  status: "pending" | "accepted" | "dismissed";
}

/**
 * suggestion - AI suggestions for missing elements
 */
export interface SuggestionMetadata {
  artifact_id: string;
  suggestions: SuggestionItem[];
}

/**
 * summary - One-sentence summary
 */
export interface SummaryMetadata {
  artifact_id: string;
}

/**
 * user_edit - User edited an artifact
 */
export interface UserEditMetadata {
  artifact_id: string;
  original_text: string;
  edit_summary?: string;
}

/**
 * accepted_suggestion - User accepted a suggestion
 */
export interface AcceptedSuggestionMetadata {
  suggestion_message_id: string;
  suggestion_id: string;
  artifact_id: string;
  applied_text: string;
}

/**
 * instruction_response - AI response to instruction/question
 */
export interface InstructionResponseMetadata {
  user_input_id: string;
  instruction: string;
  action: "add_content" | "edit_content" | "accept_suggestion" | "reject_suggestion" | "answer_question";
  artifact_id?: string;
  changes_made?: string;
}

/**
 * clarification_request - AI asking for clarification
 */
export interface ClarificationRequestMetadata {
  user_input_id: string;
  original_instruction: string;
  options?: string[];
}

/**
 * status_update - System status messages
 */
export interface StatusUpdateMetadata {
  user_input_id?: string;
  artifact_id?: string;
  status: "info" | "warning" | "error";
  action?: {
    label: string;
    type: "retry_upload" | "retry_processing";
  };
}

// =============================================================================
// Union Type for All Metadata
// =============================================================================

export type MessageMetadata =
  | UserInputMetadata
  | ArtifactCreatedMetadata
  | ArtifactUpdatedMetadata
  | SuggestionMetadata
  | SummaryMetadata
  | UserEditMetadata
  | AcceptedSuggestionMetadata
  | InstructionResponseMetadata
  | ClarificationRequestMetadata
  | StatusUpdateMetadata;

// =============================================================================
// Typed Message Variants
// =============================================================================

export interface UserInputMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "practitioner";
  message_type: "user_input";
  metadata: UserInputMetadata;
}

export interface ArtifactCreatedMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "skill_ai" | "transcription_ai";
  message_type: "artifact_created";
  metadata: ArtifactCreatedMetadata;
}

export interface ArtifactUpdatedMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "skill_ai" | "assistant_ai";
  message_type: "artifact_updated";
  metadata: ArtifactUpdatedMetadata;
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

export interface InstructionResponseMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "assistant_ai";
  message_type: "instruction_response";
  metadata: InstructionResponseMetadata;
}

export interface ClarificationRequestMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "assistant_ai";
  message_type: "clarification_request";
  metadata: ClarificationRequestMetadata;
}

export interface StatusUpdateMessage extends Omit<ConversationMessage, "metadata"> {
  participant_type: "system";
  message_type: "status_update";
  metadata: StatusUpdateMetadata;
}

// =============================================================================
// Discriminated Union of All Message Types
// =============================================================================

export type TypedConversationMessage =
  | UserInputMessage
  | ArtifactCreatedMessage
  | ArtifactUpdatedMessage
  | SuggestionMessage
  | SummaryMessage
  | UserEditMessage
  | AcceptedSuggestionMessage
  | InstructionResponseMessage
  | ClarificationRequestMessage
  | StatusUpdateMessage;

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Conversation with last message for list display
 */
export interface ConversationWithPreview extends Conversation {
  last_message?: ConversationMessage;
  message_count: number;
}

// =============================================================================
// Status Display Helpers
// =============================================================================

/**
 * Get tick status display for user input
 */
export function getTickStatus(status: UserInputMessageStatus): {
  ticks: 0 | 1 | 2;
  color: "grey" | "blue";
  animated: boolean;
  error: boolean;
} {
  switch (status) {
    case "received":
      return { ticks: 1, color: "grey", animated: false, error: false };
    case "uploading":
    case "classifying":
      return { ticks: 1, color: "grey", animated: true, error: false };
    case "processing":
      return { ticks: 2, color: "grey", animated: false, error: false };
    case "completed":
      return { ticks: 2, color: "blue", animated: false, error: false };
    case "failed":
      return { ticks: 0, color: "grey", animated: false, error: true };
  }
}

/**
 * Time-based greeting helper
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning!";
  if (hour >= 12 && hour < 17) return "Good afternoon!";
  if (hour >= 17 && hour < 21) return "Good evening!";
  return "Working late?";
}

// =============================================================================
// Type Guards
// =============================================================================

export function isUserInputMessage(msg: ConversationMessage): boolean {
  return msg.message_type === "user_input";
}

export function isArtifactCreatedMessage(msg: ConversationMessage): boolean {
  return msg.message_type === "artifact_created";
}

export function isArtifactUpdatedMessage(msg: ConversationMessage): boolean {
  return msg.message_type === "artifact_updated";
}

export function isSuggestionMessage(msg: ConversationMessage): boolean {
  return msg.message_type === "suggestion";
}

export function isStatusUpdateMessage(msg: ConversationMessage): boolean {
  return msg.message_type === "status_update";
}

/**
 * Check if message is from practitioner (right-aligned in UI)
 */
export function isPractitionerMessage(msg: ConversationMessage): boolean {
  return msg.participant_type === "practitioner";
}

/**
 * Check if message is from AI (left-aligned in UI)
 */
export function isAIMessage(msg: ConversationMessage): boolean {
  return (
    msg.participant_type === "transcription_ai" ||
    msg.participant_type === "suggestions_ai" ||
    msg.participant_type === "summary_ai" ||
    msg.participant_type === "assistant_ai" ||
    msg.participant_type === "skill_ai"
  );
}

/**
 * Check if message is system message (center-aligned in UI)
 */
export function isSystemMessage(msg: ConversationMessage): boolean {
  return msg.participant_type === "system";
}
