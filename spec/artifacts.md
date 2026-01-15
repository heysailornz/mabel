# Artifacts

Artifacts are the unified output model for all skills. Every skill produces an artifact that can be reviewed, edited, and discussed in the conversation context.

## Overview

An artifact is a structured document produced by a skill from user input. Examples:
- **Transcript** - Medical consultation notes from audio or text input
- **X-Ray Analysis** - Findings and impression from chest X-ray image
- **VBG Report** - Blood gas interpretation from VBG image
- **ECG Analysis** - Rhythm and findings from ECG image

All artifacts share common properties while having skill-specific content schemas.

## Unified Artifact Model

```typescript
interface Artifact {
  // Identity
  id: string;                          // UUID
  conversationId: string;              // Parent conversation
  practitionerId: string;              // Owner

  // Source
  skillId: string;                     // Which skill produced this
  sourceInputId: string;               // The input that created this artifact
  sourceInputType: InputType;          // "audio", "text", "image", etc.

  // Type and content
  artifactType: string;                // "transcript", "xray_analysis", etc.
  content: Record<string, unknown>;    // Skill-specific structured content
  rawContent?: string;                 // Original unprocessed content (if applicable)

  // Display
  summary: string;                     // One-sentence summary for list display
  title?: string;                      // Optional title (auto-generated or user-set)

  // AI assistance
  suggestions: Suggestion[];           // AI-generated suggestions

  // State
  status: ArtifactStatus;
  version: number;                     // Increments on each edit
  isEdited: boolean;                   // Has been modified from original

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

type ArtifactStatus = "processing" | "ready" | "failed";
type InputType = "audio" | "text" | "image" | "document" | "structured_data";

interface Suggestion {
  id: string;
  type: "missing_element" | "clarification" | "enhancement";
  element?: string;                    // Which element is missing/unclear
  message: string;                     // Human-readable suggestion
  suggestedContent?: string;           // Suggested text to add
  status: "pending" | "accepted" | "dismissed";
}
```

## Artifact Types and Schemas

### Transcript Artifact

Produced by: `transcription` skill, `text_entry` skill

```typescript
interface TranscriptContent {
  // Core text
  text: string;                        // The main transcript text
  enhancedText: string;                // After vocabulary corrections
  editedText?: string;                 // After user edits

  // Source metadata
  sourceType: "audio" | "text";
  durationSeconds?: number;            // For audio sources
  wordCount: number;
  confidence?: number;                 // Transcription confidence (audio only)

  // Structure (optional, extracted by AI)
  sections?: {
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    pastMedicalHistory?: string;
    medications?: string;
    examination?: string;
    assessment?: string;
    plan?: string;
  };
}

// Example transcript artifact
const transcriptExample: Artifact = {
  id: "abc-123",
  conversationId: "conv-456",
  practitionerId: "user-789",

  skillId: "transcription",
  sourceInputId: "input-001",
  sourceInputType: "audio",

  artifactType: "transcript",
  content: {
    text: "Patient is a 45-year-old male presenting with chest pain...",
    enhancedText: "Patient is a 45-year-old male presenting with chest pain...",
    sourceType: "audio",
    durationSeconds: 180,
    wordCount: 450,
    confidence: 0.94,
    sections: {
      chiefComplaint: "Chest pain",
      historyOfPresentIllness: "3 days of substernal chest pain...",
      // ...
    }
  },

  summary: "45yo male with chest pain, rule out ACS",
  suggestions: [
    {
      id: "sug-1",
      type: "missing_element",
      element: "follow_up",
      message: "No follow-up timeframe specified",
      suggestedContent: "Follow up in [X] weeks",
      status: "pending"
    }
  ],

  status: "ready",
  version: 1,
  isEdited: false,
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
};
```

### X-Ray Analysis Artifact

Produced by: `xray_analysis` skill (future)

```typescript
interface XRayAnalysisContent {
  // Source
  imageUrl: string;                    // Storage URL to original image
  thumbnailUrl?: string;               // Smaller preview image
  viewType: "PA" | "lateral" | "AP" | "unknown";

  // Findings
  findings: XRayFinding[];
  impression: string;                  // Overall impression
  recommendations: string[];

  // Quality
  imageQuality: "good" | "adequate" | "limited";
  limitations?: string;                // Technical limitations affecting interpretation

  // Comparison
  comparisonAvailable: boolean;
  comparisonNotes?: string;
}

interface XRayFinding {
  id: string;
  region: string;                      // "right_upper_lobe", "cardiac_silhouette", etc.
  finding: string;                     // "consolidation", "cardiomegaly", etc.
  severity: "normal" | "mild" | "moderate" | "severe";
  confidence: number;                  // AI confidence 0-1
  description: string;                 // Detailed description
  boundingBox?: {                      // Location on image (optional)
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Example X-ray analysis artifact
const xrayExample: Artifact = {
  id: "xray-123",
  conversationId: "conv-456",
  practitionerId: "user-789",

  skillId: "xray_analysis",
  sourceInputId: "input-002",
  sourceInputType: "image",

  artifactType: "xray_analysis",
  content: {
    imageUrl: "https://storage.../xray-001.jpg",
    viewType: "PA",
    findings: [
      {
        id: "f1",
        region: "right_lower_lobe",
        finding: "consolidation",
        severity: "moderate",
        confidence: 0.87,
        description: "Patchy consolidation in the right lower lobe consistent with pneumonia"
      },
      {
        id: "f2",
        region: "cardiac_silhouette",
        finding: "normal",
        severity: "normal",
        confidence: 0.95,
        description: "Cardiac silhouette within normal limits"
      }
    ],
    impression: "Right lower lobe pneumonia. No cardiomegaly or pleural effusion.",
    recommendations: [
      "Consider antibiotic therapy",
      "Follow-up chest X-ray in 4-6 weeks to ensure resolution"
    ],
    imageQuality: "good",
    comparisonAvailable: false
  },

  summary: "CXR: Right lower lobe pneumonia",
  suggestions: [
    {
      id: "sug-1",
      type: "enhancement",
      message: "Would you like to add these findings to your consultation notes?",
      status: "pending"
    }
  ],

  status: "ready",
  version: 1,
  isEdited: false,
  createdAt: "2024-01-15T11:00:00Z",
  updatedAt: "2024-01-15T11:00:00Z",
};
```

### VBG Analysis Artifact

Produced by: `vbg_analysis` skill (future)

```typescript
interface VBGAnalysisContent {
  // Source
  imageUrl?: string;                   // If extracted from image
  manualEntry: boolean;                // If values entered manually

  // Values
  values: {
    pH: number;
    pCO2: number;                      // mmHg
    pO2?: number;                      // mmHg (may not be reliable on VBG)
    HCO3: number;                      // mEq/L
    baseExcess: number;                // mEq/L
    lactate?: number;                  // mmol/L
    sodium?: number;
    potassium?: number;
    chloride?: number;
    glucose?: number;
    hemoglobin?: number;
  };

  // Reference ranges used
  referenceRanges: {
    pH: { min: number; max: number };
    pCO2: { min: number; max: number };
    // ...
  };

  // Interpretation
  interpretation: {
    primaryDisorder: AcidBaseDisorder;
    compensation: "uncompensated" | "partial" | "full";
    anionGap: "normal" | "elevated";
    anionGapValue?: number;
    deltaRatio?: number;
    oxygenation?: "normal" | "hypoxic" | "not_assessable";
  };

  // Clinical correlation
  stepByStepAnalysis: string[];        // Educational breakdown of interpretation
  clinicalCorrelation: string;
  differentialDiagnoses: string[];
  recommendations: string[];
}

type AcidBaseDisorder =
  | "respiratory_acidosis"
  | "respiratory_alkalosis"
  | "metabolic_acidosis"
  | "metabolic_alkalosis"
  | "mixed_disorder"
  | "normal";
```

## Artifact Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CREATION                                                                  │
│    User provides input → Skill processes → Artifact created                 │
│    status: "processing" → "ready"                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. REVIEW                                                                    │
│    User views artifact in conversation                                       │
│    → Taps "Review" to see full content                                      │
│    → Suggestions displayed as questions/prompts                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. ENRICHMENT (optional)                                                     │
│    User provides additional input classified as "enrich_existing"           │
│    → Content merged into artifact                                           │
│    → Suggestions regenerated                                                │
│    → version incremented                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. EDITING                                                                   │
│    User manually edits artifact content                                      │
│    → isEdited = true                                                        │
│    → version incremented                                                    │
│    → Vocabulary learning triggered (for transcripts)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. DISCUSSION                                                                │
│    User asks questions or gives instructions about artifact                 │
│    → AI responds with context from artifact                                 │
│    → Instructions may modify artifact                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. EXPORT                                                                    │
│    User exports/copies artifact content                                      │
│    → Formatted based on artifact type                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Artifact in Conversation Context

Artifacts are linked to conversations and appear as message threads:

```
┌────────────────────────────────────────────────────────────────┐
│ User Input (recording/text/image)                              │
│ ───────────────────────────────────────────                    │
│ [Audio waveform] or [Text bubble] or [Image thumbnail]     ✓✓  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ AI Response                                                     │
│ ───────────────────────────────────────────                    │
│ Got it. This looks like a consultation about chest pain.       │
│                                                                 │
│ I have a couple of suggestions:                                │
│ • What about the cardiac examination findings?                  │
│ • Was an ECG performed?                                        │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 📄  Draft Transcript                                        │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ Review                                                   →  │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ Review on web                                          [QR] │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

For image-based artifacts (X-ray, VBG), the card shows a thumbnail:

```
┌────────────────────────────────────────────────────────────────┐
│ AI Response                                                     │
│ ───────────────────────────────────────────                    │
│ I've analyzed the chest X-ray. There appears to be right       │
│ lower lobe consolidation consistent with pneumonia.            │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🔬  X-Ray Analysis                          [thumbnail]     │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ Review Analysis                                          →  │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ Add to Notes                                             +  │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## Cross-Artifact References

Artifacts can reference each other, enabling rich documentation:

```typescript
interface ArtifactReference {
  artifactId: string;
  artifactType: string;
  referenceType: "supports" | "related" | "supersedes";
  addedAt: string;
}

// Example: X-ray analysis added to transcript
const transcriptWithXray: Artifact = {
  // ... base properties
  artifactType: "transcript",
  content: {
    text: "... Chest X-ray performed shows right lower lobe consolidation...",
    // ...
  },
  references: [
    {
      artifactId: "xray-123",
      artifactType: "xray_analysis",
      referenceType: "supports",
      addedAt: "2024-01-15T11:05:00Z"
    }
  ]
};
```

## Enriching Artifacts

When a user input is classified with `intent: "enrich_existing"`, the skill merges content into the target artifact:

### Text Fragment → Transcript

```typescript
async function enrichTranscript(
  targetArtifact: Artifact,
  newContent: string,
  practitionerId: string
): Promise<Artifact> {
  // 1. Enhance the new content
  const enhancedContent = await enhanceTranscript(newContent, practitionerId);

  // 2. Merge into existing transcript
  const currentContent = targetArtifact.content as TranscriptContent;
  const mergedText = `${currentContent.enhancedText}\n\n[Additional notes]\n${enhancedContent}`;

  // 3. Update word count
  const newWordCount = mergedText.split(/\s+/).length;

  // 4. Regenerate suggestions
  const newSuggestions = await generateSuggestions(mergedText);

  // 5. Update artifact
  return await updateArtifact(targetArtifact.id, {
    content: {
      ...currentContent,
      enhancedText: mergedText,
      wordCount: newWordCount,
    },
    suggestions: newSuggestions,
    version: targetArtifact.version + 1,
  });
}
```

### X-Ray Analysis → Transcript

```typescript
async function addXrayToTranscript(
  transcriptArtifact: Artifact,
  xrayArtifact: Artifact
): Promise<Artifact> {
  const xrayContent = xrayArtifact.content as XRayAnalysisContent;
  const transcriptContent = transcriptArtifact.content as TranscriptContent;

  // Format X-ray findings for transcript
  const xrayText = formatXrayForTranscript(xrayContent);

  // Merge into transcript
  const mergedText = `${transcriptContent.enhancedText}\n\n[Imaging]\n${xrayText}`;

  // Add reference
  const references = [
    ...(transcriptArtifact.references || []),
    {
      artifactId: xrayArtifact.id,
      artifactType: "xray_analysis",
      referenceType: "supports",
      addedAt: new Date().toISOString(),
    }
  ];

  return await updateArtifact(transcriptArtifact.id, {
    content: {
      ...transcriptContent,
      enhancedText: mergedText,
    },
    references,
    version: transcriptArtifact.version + 1,
  });
}

function formatXrayForTranscript(xray: XRayAnalysisContent): string {
  const findings = xray.findings
    .map(f => `- ${f.region}: ${f.description}`)
    .join("\n");

  return `Chest X-ray (${xray.viewType} view):
${findings}

Impression: ${xray.impression}`;
}
```

## Artifact UI Components

| Component | Description |
|-----------|-------------|
| `ArtifactCard` | Collapsible card showing artifact summary with actions |
| `ArtifactViewer` | Full-screen view for reviewing/editing artifact |
| `ArtifactThumbnail` | Small preview for image-based artifacts |
| `ArtifactActions` | Action buttons (Review, Add to Notes, Export) |
| `ArtifactDiff` | Side-by-side comparison for edited artifacts |
| `ArtifactReference` | Inline reference to another artifact |

### Artifact Card Variants

**Text-based artifacts (transcript):**
```
┌─────────────────────────────────────┐
│ 📄  Draft Transcript                │
├─────────────────────────────────────┤
│ Review                          →   │
├─────────────────────────────────────┤
│ Review on web                  [QR] │
└─────────────────────────────────────┘
```

**Image-based artifacts (X-ray, VBG):**
```
┌─────────────────────────────────────┐
│ 🔬  X-Ray Analysis    [thumbnail]   │
├─────────────────────────────────────┤
│ Review Analysis                 →   │
├─────────────────────────────────────┤
│ Add to Notes                    +   │
└─────────────────────────────────────┘
```

**Analysis artifacts (VBG):**
```
┌─────────────────────────────────────┐
│ 🧪  VBG Analysis                    │
│     pH 7.28 | pCO2 52 | HCO3 24     │
├─────────────────────────────────────┤
│ Respiratory acidosis, uncompensated │
├─────────────────────────────────────┤
│ Review Analysis                 →   │
├─────────────────────────────────────┤
│ Add to Notes                    +   │
└─────────────────────────────────────┘
```

## Export Formats

Each artifact type has defined export formats:

### Transcript Export
- **Plain text**: Raw transcript text
- **Structured**: Sections separated with headers
- **SOAP format**: Converted to SOAP note structure

### X-Ray Analysis Export
- **Report**: Formal radiology report format
- **Summary**: Brief findings and impression
- **For notes**: Formatted for inclusion in clinical notes

### VBG Analysis Export
- **Report**: Full interpretation with values
- **Summary**: Primary disorder and recommendations
- **For notes**: Brief interpretation for clinical notes

## Related Specs

- [skills.md](./skills.md) - Skill architecture and definitions
- [conversations.md](./conversations.md) - Conversation message integration
- [database.md](./database.md) - Artifacts database schema
- [learning-pipeline.md](./learning-pipeline.md) - Vocabulary learning from transcript edits
