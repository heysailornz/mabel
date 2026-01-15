/**
 * Artifact Types
 *
 * Artifacts are the unified output model for all skills. Every skill produces
 * an artifact that can be reviewed, edited, and discussed in the conversation context.
 */

import type { Database } from "@project/db/types";
import type { InputType, ArtifactType } from "../skills/types";

// Base types from database
export type Artifact = Database["public"]["Tables"]["artifacts"]["Row"];
export type ArtifactInsert = Database["public"]["Tables"]["artifacts"]["Insert"];
export type ArtifactUpdate = Database["public"]["Tables"]["artifacts"]["Update"];

// Artifact status values
export const ARTIFACT_STATUSES = ["processing", "ready", "failed"] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

/**
 * AI-generated suggestion for artifact improvement
 */
export interface Suggestion {
  id: string;
  type: "missing_element" | "clarification" | "enhancement";
  element?: string; // Which element is missing/unclear
  message: string; // Human-readable suggestion
  suggestedContent?: string; // Suggested text to add
  status: "pending" | "accepted" | "dismissed";
}

/**
 * Reference to another artifact
 */
export interface ArtifactReference {
  artifactId: string;
  artifactType: ArtifactType;
  referenceType: "supports" | "related" | "supersedes";
  addedAt: string; // ISO timestamp
}

// =============================================================================
// Content Schemas for Each Artifact Type
// =============================================================================

/**
 * Transcript Content Schema
 *
 * Produced by: transcription skill, text_entry skill
 */
export interface TranscriptContent {
  // Core text
  text: string; // The main transcript text
  enhancedText: string; // After vocabulary corrections
  editedText?: string; // After user edits

  // Source metadata
  sourceType: "audio" | "text";
  durationSeconds?: number; // For audio sources
  wordCount: number;
  confidence?: number; // Transcription confidence (audio only)

  // Structure (optional, extracted by AI)
  sections?: TranscriptSections;
}

/**
 * Structured sections of a medical transcript
 */
export interface TranscriptSections {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  medications?: string;
  allergies?: string;
  socialHistory?: string;
  familyHistory?: string;
  reviewOfSystems?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}

/**
 * X-Ray Analysis Content Schema
 *
 * Produced by: xray_analysis skill (future)
 */
export interface XRayAnalysisContent {
  // Source
  imageUrl: string; // Storage URL to original image
  thumbnailUrl?: string; // Smaller preview image
  viewType: "PA" | "lateral" | "AP" | "unknown";

  // Findings
  findings: XRayFinding[];
  impression: string; // Overall impression
  recommendations: string[];

  // Quality
  imageQuality: "good" | "adequate" | "limited";
  limitations?: string; // Technical limitations affecting interpretation

  // Comparison
  comparisonAvailable: boolean;
  comparisonNotes?: string;
}

/**
 * Individual X-Ray finding
 */
export interface XRayFinding {
  id: string;
  region: string; // "right_upper_lobe", "cardiac_silhouette", etc.
  finding: string; // "consolidation", "cardiomegaly", etc.
  severity: "normal" | "mild" | "moderate" | "severe";
  confidence: number; // AI confidence 0-1
  description: string; // Detailed description
  boundingBox?: {
    // Location on image (optional)
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * VBG/ABG Analysis Content Schema
 *
 * Produced by: vbg_analysis skill (future)
 */
export interface VBGAnalysisContent {
  // Source
  imageUrl?: string; // If extracted from image
  manualEntry: boolean; // If values entered manually

  // Values
  values: BloodGasValues;

  // Reference ranges used
  referenceRanges: BloodGasReferenceRanges;

  // Interpretation
  interpretation: BloodGasInterpretation;

  // Clinical correlation
  stepByStepAnalysis: string[]; // Educational breakdown
  clinicalCorrelation: string;
  differentialDiagnoses: string[];
  recommendations: string[];
}

/**
 * Blood gas measurement values
 */
export interface BloodGasValues {
  pH: number;
  pCO2: number; // mmHg
  pO2?: number; // mmHg (may not be reliable on VBG)
  HCO3: number; // mEq/L
  baseExcess: number; // mEq/L
  lactate?: number; // mmol/L
  sodium?: number;
  potassium?: number;
  chloride?: number;
  glucose?: number;
  hemoglobin?: number;
}

/**
 * Reference ranges for blood gas values
 */
export interface BloodGasReferenceRanges {
  pH: { min: number; max: number };
  pCO2: { min: number; max: number };
  pO2?: { min: number; max: number };
  HCO3: { min: number; max: number };
  baseExcess: { min: number; max: number };
}

/**
 * Acid-base disorder types
 */
export type AcidBaseDisorder =
  | "respiratory_acidosis"
  | "respiratory_alkalosis"
  | "metabolic_acidosis"
  | "metabolic_alkalosis"
  | "mixed_disorder"
  | "normal";

/**
 * Blood gas interpretation result
 */
export interface BloodGasInterpretation {
  primaryDisorder: AcidBaseDisorder;
  compensation: "uncompensated" | "partial" | "full";
  anionGap: "normal" | "elevated";
  anionGapValue?: number;
  deltaRatio?: number;
  oxygenation?: "normal" | "hypoxic" | "not_assessable";
}

/**
 * ECG Analysis Content Schema
 *
 * Produced by: ecg_analysis skill (future)
 */
export interface ECGAnalysisContent {
  // Source
  imageUrl: string;
  thumbnailUrl?: string;

  // Basic measurements
  measurements: ECGMeasurements;

  // Rhythm analysis
  rhythm: ECGRhythm;

  // Findings
  findings: ECGFinding[];

  // Interpretation
  interpretation: string;
  recommendations: string[];

  // Quality
  imageQuality: "good" | "adequate" | "limited";
  limitations?: string;
}

/**
 * ECG measurements
 */
export interface ECGMeasurements {
  heartRate: number;
  prInterval?: number; // ms
  qrsDuration?: number; // ms
  qtInterval?: number; // ms
  qtcInterval?: number; // ms (corrected)
  axis?: number; // degrees
}

/**
 * ECG rhythm classification
 */
export interface ECGRhythm {
  classification: string; // "sinus_rhythm", "atrial_fibrillation", etc.
  regular: boolean;
  confidence: number;
  description: string;
}

/**
 * Individual ECG finding
 */
export interface ECGFinding {
  id: string;
  category: "rhythm" | "morphology" | "ischemia" | "conduction" | "other";
  finding: string;
  severity: "normal" | "borderline" | "abnormal" | "critical";
  confidence: number;
  description: string;
  leads?: string[]; // Which leads show this finding
}

// =============================================================================
// Union Types
// =============================================================================

/**
 * Union of all artifact content types
 */
export type ArtifactContent =
  | TranscriptContent
  | XRayAnalysisContent
  | VBGAnalysisContent
  | ECGAnalysisContent;

// =============================================================================
// Typed Artifact Variants
// =============================================================================

/**
 * Artifact with typed content for transcript
 */
export interface TranscriptArtifact extends Omit<Artifact, "content" | "suggestions" | "references"> {
  artifact_type: "transcript";
  skill_id: "transcription" | "text_entry";
  content: TranscriptContent;
  suggestions: Suggestion[];
  references: ArtifactReference[];
}

/**
 * Artifact with typed content for X-ray analysis
 */
export interface XRayArtifact extends Omit<Artifact, "content" | "suggestions" | "references"> {
  artifact_type: "xray_analysis";
  skill_id: "xray_analysis";
  content: XRayAnalysisContent;
  suggestions: Suggestion[];
  references: ArtifactReference[];
}

/**
 * Artifact with typed content for VBG analysis
 */
export interface VBGArtifact extends Omit<Artifact, "content" | "suggestions" | "references"> {
  artifact_type: "vbg_analysis";
  skill_id: "vbg_analysis";
  content: VBGAnalysisContent;
  suggestions: Suggestion[];
  references: ArtifactReference[];
}

/**
 * Artifact with typed content for ECG analysis
 */
export interface ECGArtifact extends Omit<Artifact, "content" | "suggestions" | "references"> {
  artifact_type: "ecg_analysis";
  skill_id: "ecg_analysis";
  content: ECGAnalysisContent;
  suggestions: Suggestion[];
  references: ArtifactReference[];
}

/**
 * Discriminated union of all typed artifacts
 */
export type TypedArtifact = TranscriptArtifact | XRayArtifact | VBGArtifact | ECGArtifact;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if artifact is a transcript
 */
export function isTranscriptArtifact(artifact: Artifact): boolean {
  return artifact.artifact_type === "transcript";
}

/**
 * Check if artifact is an X-ray analysis
 */
export function isXRayArtifact(artifact: Artifact): boolean {
  return artifact.artifact_type === "xray_analysis";
}

/**
 * Check if artifact is a VBG analysis
 */
export function isVBGArtifact(artifact: Artifact): boolean {
  return artifact.artifact_type === "vbg_analysis";
}

/**
 * Check if artifact is an ECG analysis
 */
export function isECGArtifact(artifact: Artifact): boolean {
  return artifact.artifact_type === "ecg_analysis";
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the display text for an artifact (for preview/summary)
 */
export function getArtifactDisplayText(artifact: Artifact): string {
  if (artifact.summary) {
    return artifact.summary;
  }

  const content = artifact.content as ArtifactContent | null;
  if (!content) {
    return "Processing...";
  }

  if (artifact.artifact_type === "transcript") {
    const tc = content as TranscriptContent;
    return tc.editedText || tc.enhancedText || tc.text || "No content";
  }

  if (artifact.artifact_type === "xray_analysis") {
    const xc = content as XRayAnalysisContent;
    return xc.impression || "X-ray analysis";
  }

  if (artifact.artifact_type === "vbg_analysis") {
    const vc = content as VBGAnalysisContent;
    return vc.interpretation?.primaryDisorder || "VBG analysis";
  }

  if (artifact.artifact_type === "ecg_analysis") {
    const ec = content as ECGAnalysisContent;
    return ec.interpretation || "ECG analysis";
  }

  return "Unknown artifact";
}

/**
 * Get word count from transcript artifact
 */
export function getTranscriptWordCount(artifact: TranscriptArtifact): number {
  return artifact.content.wordCount;
}

/**
 * Parse suggestions from JSON (from database)
 */
export function parseSuggestions(suggestionsJson: unknown): Suggestion[] {
  if (!suggestionsJson || !Array.isArray(suggestionsJson)) {
    return [];
  }
  return suggestionsJson as Suggestion[];
}

/**
 * Parse references from JSON (from database)
 */
export function parseReferences(referencesJson: unknown): ArtifactReference[] {
  if (!referencesJson || !Array.isArray(referencesJson)) {
    return [];
  }
  return referencesJson as ArtifactReference[];
}
