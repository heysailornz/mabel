/**
 * User Input Types
 *
 * Unified tracking for all user inputs (audio, text, image, document).
 * This is the source table that feeds into skill processing.
 */

import type { Database } from "@project/db/types";
import type { InputType, ClassificationResult } from "../skills/types";

// Base types from database
export type UserInput = Database["public"]["Tables"]["user_inputs"]["Row"];
export type UserInputInsert = Database["public"]["Tables"]["user_inputs"]["Insert"];
export type UserInputUpdate = Database["public"]["Tables"]["user_inputs"]["Update"];

// User input status values
export const USER_INPUT_STATUSES = [
  "received", // Input received, not yet classified
  "classifying", // Running through unified classifier
  "processing", // Being processed by skill
  "completed", // Successfully processed
  "failed", // Processing failed
] as const;
export type UserInputStatus = (typeof USER_INPUT_STATUSES)[number];

// Re-export InputType for convenience
export type { InputType } from "../skills/types";
export { INPUT_TYPES } from "../skills/types";

/**
 * Classification stored in user_inputs.classification column
 *
 * This matches ClassificationResult from skills/types but is stored as JSONB
 */
export interface StoredClassification {
  skillId: string;
  intent: "new_artifact" | "enrich_existing" | "instruction" | "question";
  confidence: number;
  reasoning: string;
  targetArtifactId?: string;
  suggestedAction?: string;
}

// =============================================================================
// Typed Input Variants
// =============================================================================

/**
 * Audio input (from recording)
 */
export interface AudioInput extends Omit<UserInput, "classification"> {
  input_type: "audio";
  recording_id: string; // Required for audio
  storage_path: null;
  raw_content: null;
  classification: StoredClassification | null;
}

/**
 * Text input (direct text entry)
 */
export interface TextInput extends Omit<UserInput, "classification"> {
  input_type: "text";
  recording_id: null;
  storage_path: null;
  raw_content: string; // Required for text
  classification: StoredClassification | null;
}

/**
 * Image input (photo upload)
 */
export interface ImageInput extends Omit<UserInput, "classification"> {
  input_type: "image";
  recording_id: null;
  storage_path: string; // Required for image
  raw_content: null;
  classification: StoredClassification | null;
}

/**
 * Document input (file upload)
 */
export interface DocumentInput extends Omit<UserInput, "classification"> {
  input_type: "document";
  recording_id: null;
  storage_path: string; // Required for document
  raw_content: string | null; // Extracted text (if applicable)
  classification: StoredClassification | null;
}

/**
 * Structured data input (e.g., manual VBG values)
 */
export interface StructuredDataInput extends Omit<UserInput, "classification"> {
  input_type: "structured_data";
  recording_id: null;
  storage_path: null;
  raw_content: string; // JSON string of structured data
  classification: StoredClassification | null;
}

/**
 * Discriminated union of all typed inputs
 */
export type TypedUserInput =
  | AudioInput
  | TextInput
  | ImageInput
  | DocumentInput
  | StructuredDataInput;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if input is an audio input
 */
export function isAudioInput(input: UserInput): boolean {
  return input.input_type === "audio";
}

/**
 * Check if input is a text input
 */
export function isTextInput(input: UserInput): boolean {
  return input.input_type === "text";
}

/**
 * Check if input is an image input
 */
export function isImageInput(input: UserInput): boolean {
  return input.input_type === "image";
}

/**
 * Check if input is a document input
 */
export function isDocumentInput(input: UserInput): boolean {
  return input.input_type === "document";
}

/**
 * Check if input is a structured data input
 */
export function isStructuredDataInput(input: UserInput): boolean {
  return input.input_type === "structured_data";
}

/**
 * Check if input has been classified
 */
export function isClassified(input: UserInput): boolean {
  return input.classification !== null;
}

/**
 * Check if input is in a terminal state
 */
export function isTerminalStatus(status: UserInputStatus): boolean {
  return status === "completed" || status === "failed";
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse classification from JSON (from database)
 */
export function parseClassification(classificationJson: unknown): StoredClassification | null {
  if (!classificationJson || typeof classificationJson !== "object") {
    return null;
  }
  return classificationJson as StoredClassification;
}

/**
 * Get a human-readable description of the input
 */
export function getInputDescription(input: UserInput): string {
  switch (input.input_type) {
    case "audio":
      return "Voice recording";
    case "text":
      return truncateText(input.raw_content || "Text input", 50);
    case "image":
      return "Image upload";
    case "document":
      return "Document upload";
    case "structured_data":
      return "Structured data entry";
    default:
      return "Unknown input";
  }
}

/**
 * Get the content to display for an input
 */
export function getInputContent(input: UserInput): string | null {
  if (input.input_type === "text" || input.input_type === "document") {
    return input.raw_content;
  }
  return null;
}

/**
 * Get the storage path for file-based inputs
 */
export function getInputStoragePath(input: UserInput): string | null {
  if (input.input_type === "image" || input.input_type === "document") {
    return input.storage_path;
  }
  return null;
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

// =============================================================================
// Input Status Display
// =============================================================================

/**
 * User-friendly status labels
 */
export const USER_INPUT_STATUS_LABELS: Record<UserInputStatus, string> = {
  received: "Received",
  classifying: "Analyzing",
  processing: "Processing",
  completed: "Done",
  failed: "Failed",
};

/**
 * Get display label for status
 */
export function getStatusLabel(status: UserInputStatus): string {
  return USER_INPUT_STATUS_LABELS[status] || status;
}

/**
 * Get status indicator type for UI
 */
export function getStatusIndicator(
  status: UserInputStatus
): "loading" | "success" | "error" | "pending" {
  switch (status) {
    case "received":
      return "pending";
    case "classifying":
    case "processing":
      return "loading";
    case "completed":
      return "success";
    case "failed":
      return "error";
  }
}
