// Base types from database
export type {
  UserInput,
  UserInputInsert,
  UserInputUpdate,
  UserInputStatus,
  InputType,
} from "./types";

export { USER_INPUT_STATUSES, INPUT_TYPES } from "./types";

// Classification
export type { StoredClassification } from "./types";

// Typed input variants
export type {
  AudioInput,
  TextInput,
  ImageInput,
  DocumentInput,
  StructuredDataInput,
  TypedUserInput,
} from "./types";

// Type guards
export {
  isAudioInput,
  isTextInput,
  isImageInput,
  isDocumentInput,
  isStructuredDataInput,
  isClassified,
  isTerminalStatus,
} from "./types";

// Helper functions
export {
  parseClassification,
  getInputDescription,
  getInputContent,
  getInputStoragePath,
} from "./types";

// Status display
export {
  USER_INPUT_STATUS_LABELS,
  getStatusLabel,
  getStatusIndicator,
} from "./types";
