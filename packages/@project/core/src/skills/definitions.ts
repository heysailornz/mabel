/**
 * Built-in Skill Definitions
 *
 * These are the core skills that ship with the application.
 * Future skills (x-ray, VBG, ECG) can be added by following this pattern.
 */

import type { SkillDefinition } from "./types";

/**
 * Transcription Skill
 *
 * Converts audio recordings into structured medical transcripts.
 */
export const transcriptionSkill: SkillDefinition = {
  id: "transcription",
  name: "Medical Transcription",
  description: "Convert audio recordings into structured medical transcripts",
  version: "1.0.0",

  inputTypes: ["audio"],
  maxInputSize: 100 * 1024 * 1024, // 100MB
  acceptedMimeTypes: ["audio/aac", "audio/mp4", "audio/mpeg", "audio/m4a"],

  artifactType: "transcript",

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 1,
  enrichCost: 0,

  classificationPrompt: `
    Audio input containing spoken medical consultation notes.
    May include patient symptoms, examination findings, assessments, and plans.
  `.trim(),

  processorFunction: "process-transcription",
  timeoutMs: 300000, // 5 minutes

  artifactIcon: "FileText",
  artifactActions: [
    { id: "review", label: "Review", availableOn: ["mobile", "web"] },
    { id: "review_web", label: "Review on web", availableOn: ["mobile"] },
    { id: "export", label: "Export", availableOn: ["web"] },
    { id: "copy", label: "Copy", availableOn: ["web"] },
  ],
};

/**
 * Text Entry Skill
 *
 * Processes direct text input (consultation notes, instructions, questions).
 */
export const textEntrySkill: SkillDefinition = {
  id: "text_entry",
  name: "Text Input",
  description: "Process text input as consultation notes, instructions, or questions",
  version: "1.0.0",

  inputTypes: ["text"],
  maxInputSize: 50000, // ~50KB of text

  artifactType: "transcript", // Produces same artifact type as transcription

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 1, // Only for new_artifact intent
  enrichCost: 0,

  classificationPrompt: `
    Text input from practitioner. Could be:
    - Clinical content for documentation (new artifact or enrich existing)
    - Instruction to modify existing documentation
    - Question about documentation
  `.trim(),

  processorFunction: "process-text-entry",
  timeoutMs: 60000, // 1 minute

  artifactIcon: "FileText",
  artifactActions: [
    { id: "review", label: "Review", availableOn: ["mobile", "web"] },
    { id: "review_web", label: "Review on web", availableOn: ["mobile"] },
    { id: "export", label: "Export", availableOn: ["web"] },
  ],
};

/**
 * X-Ray Analysis Skill (Template for future implementation)
 *
 * AI-assisted analysis of chest X-ray images.
 */
export const xrayAnalysisSkill: SkillDefinition = {
  id: "xray_analysis",
  name: "Chest X-Ray Analysis",
  description: "AI-assisted analysis of chest X-ray images",
  version: "1.0.0",

  inputTypes: ["image"],
  maxInputSize: 50 * 1024 * 1024, // 50MB
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/dicom"],

  artifactType: "xray_analysis",

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 2, // Higher cost for image analysis
  enrichCost: 1,

  classificationPrompt: `
    Image of a chest X-ray (CXR). Look for:
    - PA or lateral view chest radiograph
    - Medical imaging with lung fields visible
    - DICOM or standard image formats
  `.trim(),
  autoDetectPatterns: ["chest x-ray", "cxr", "chest radiograph", "lung x-ray"],

  processorFunction: "process-xray-analysis",
  timeoutMs: 120000, // 2 minutes

  artifactIcon: "Scan",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
    { id: "export", label: "Export Report", availableOn: ["web"] },
  ],
};

/**
 * VBG Analysis Skill (Template for future implementation)
 *
 * Analyze venous or arterial blood gas images and provide interpretation.
 */
export const vbgAnalysisSkill: SkillDefinition = {
  id: "vbg_analysis",
  name: "VBG/ABG Analysis",
  description: "Analyze venous or arterial blood gas images and provide interpretation",
  version: "1.0.0",

  inputTypes: ["image", "structured_data"],
  maxInputSize: 10 * 1024 * 1024, // 10MB
  acceptedMimeTypes: ["image/jpeg", "image/png"],

  artifactType: "vbg_analysis",

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 1,
  enrichCost: 0,

  classificationPrompt: `
    Image of blood gas results (VBG or ABG) from a blood gas analyzer.
    Or structured data containing pH, pCO2, pO2, HCO3, BE values.
  `.trim(),
  autoDetectPatterns: ["vbg", "abg", "blood gas", "arterial gas", "venous gas"],

  processorFunction: "process-vbg-analysis",
  timeoutMs: 60000, // 1 minute

  artifactIcon: "TestTube",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
  ],
};

/**
 * ECG Analysis Skill (Template for future implementation)
 *
 * AI-assisted 12-lead ECG interpretation.
 */
export const ecgAnalysisSkill: SkillDefinition = {
  id: "ecg_analysis",
  name: "ECG Analysis",
  description: "AI-assisted 12-lead ECG interpretation",
  version: "1.0.0",

  inputTypes: ["image"],
  maxInputSize: 25 * 1024 * 1024, // 25MB
  acceptedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],

  artifactType: "ecg_analysis",

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 2,
  enrichCost: 1,

  classificationPrompt: `
    12-lead ECG or rhythm strip image.
  `.trim(),
  autoDetectPatterns: ["ecg", "ekg", "electrocardiogram", "rhythm strip"],

  processorFunction: "process-ecg-analysis",
  timeoutMs: 120000, // 2 minutes

  artifactIcon: "Activity",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
  ],
};
