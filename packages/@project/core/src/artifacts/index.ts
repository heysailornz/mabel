// Base types from database
export type {
  Artifact,
  ArtifactInsert,
  ArtifactUpdate,
  ArtifactStatus,
} from "./types";

export { ARTIFACT_STATUSES } from "./types";

// Common structures
export type { Suggestion, ArtifactReference } from "./types";

// Content schemas
export type {
  TranscriptContent,
  TranscriptSections,
  XRayAnalysisContent,
  XRayFinding,
  VBGAnalysisContent,
  BloodGasValues,
  BloodGasReferenceRanges,
  BloodGasInterpretation,
  AcidBaseDisorder,
  ECGAnalysisContent,
  ECGMeasurements,
  ECGRhythm,
  ECGFinding,
  ArtifactContent,
} from "./types";

// Typed artifact variants
export type {
  TranscriptArtifact,
  XRayArtifact,
  VBGArtifact,
  ECGArtifact,
  TypedArtifact,
} from "./types";

// Type guards
export {
  isTranscriptArtifact,
  isXRayArtifact,
  isVBGArtifact,
  isECGArtifact,
} from "./types";

// Helper functions
export {
  getArtifactDisplayText,
  getTranscriptWordCount,
  parseSuggestions,
  parseReferences,
} from "./types";
