/**
 * Skills Architecture Types
 *
 * Skills are modular processing capabilities that transform user inputs into artifacts.
 * The architecture is designed to be extensible - adding new skills requires minimal changes.
 */

// Input types that skills can accept
export const INPUT_TYPES = ["audio", "text", "image", "document", "structured_data"] as const;
export type InputType = (typeof INPUT_TYPES)[number];

// Artifact types that skills can produce
export const ARTIFACT_TYPES = [
  "transcript",
  "xray_analysis",
  "vbg_analysis",
  "ecg_analysis",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

// Platform availability for actions
export type Platform = "mobile" | "web";

/**
 * Actions available on artifact cards
 */
export interface ArtifactAction {
  id: string;
  label: string;
  icon?: string;
  availableOn: Platform[];
}

/**
 * Complete skill definition
 *
 * Each skill is defined with these properties to enable:
 * - Input validation
 * - Classification hints
 * - Credit pricing
 * - UI rendering
 */
export interface SkillDefinition {
  // Identity
  id: string;
  name: string;
  description: string;
  version: string;

  // Input configuration
  inputTypes: InputType[];
  maxInputSize?: number; // Max file size in bytes
  acceptedMimeTypes?: string[]; // For images/documents

  // Output configuration
  artifactType: ArtifactType;

  // Behavior
  canEnrichExisting: boolean;
  enrichableArtifactTypes: ArtifactType[];

  // Pricing
  creditCost: number; // Credits for new_artifact intent
  enrichCost: number; // Credits for enrich_existing (usually 0)

  // Classification hints for the unified classifier
  classificationPrompt: string;
  autoDetectPatterns?: string[];

  // Processing
  processorFunction: string; // Edge function name
  timeoutMs: number;

  // UI
  artifactIcon: string;
  artifactActions: ArtifactAction[];
}

/**
 * Classification intent - what the user wants to do with their input
 */
export const CLASSIFICATION_INTENTS = [
  "new_artifact", // Create standalone artifact (uses credits)
  "enrich_existing", // Add to existing artifact (free or reduced)
  "instruction", // Modify documentation (free)
  "question", // Query about documentation (free)
] as const;
export type ClassificationIntent = (typeof CLASSIFICATION_INTENTS)[number];

/**
 * Result from the unified classifier
 */
export interface ClassificationResult {
  skillId: string;
  intent: ClassificationIntent;
  confidence: number;
  reasoning: string;
  targetArtifactId?: string; // For enrich_existing intent
  suggestedAction?: string; // For instruction intent
}

/**
 * Input to the unified classifier
 */
export interface ClassificationInput {
  inputType: InputType;
  content: string | Blob;
  contentDescription?: string;
  conversationId: string;
  practitionerId: string;
  conversationContext: {
    recentMessageCount: number;
    existingArtifactIds: string[];
    hasActiveArtifact: boolean;
  };
}
