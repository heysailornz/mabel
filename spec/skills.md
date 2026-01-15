# Skills Architecture

Skills are modular processing capabilities that transform user inputs into artifacts. The architecture is designed to be extensible - adding new skills (image analysis, document parsing, etc.) requires minimal changes to the core system.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│                    (audio, text, image, document, etc.)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNIFIED CLASSIFIER                                   │
│                                                                              │
│   Input: raw input + conversation context                                    │
│   Output: { inputType, skillId, intent, confidence }                        │
│                                                                              │
│   Intent types:                                                              │
│   - new_artifact: Create standalone artifact (uses credits)                 │
│   - enrich_existing: Add to existing artifact (free)                        │
│   - instruction: Modify documentation (free)                                │
│   - question: Query about documentation (free)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SKILL ROUTER                                       │
│                                                                              │
│   Loads skill definition → validates input → invokes processor              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │Transcription│          │ X-Ray       │          │ VBG         │
   │   Skill     │          │ Analysis    │          │ Analysis    │
   │             │          │ (future)    │          │ (future)    │
   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
          │                        │                        │
          └────────────────────────┴────────────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │      UNIFIED ARTIFACT         │
                    │   (reviewable, editable,      │
                    │    discussable)               │
                    └───────────────────────────────┘
```

## Skill Definition Model

Each skill is defined with the following properties:

```typescript
interface SkillDefinition {
  // Identity
  id: string;                          // "transcription", "xray_analysis", "vbg_analysis"
  name: string;                        // "Medical Transcription"
  description: string;                 // Human-readable description
  version: string;                     // "1.0.0"

  // Input configuration
  inputTypes: InputType[];             // ["audio", "text"], ["image"], etc.
  maxInputSize?: number;               // Max file size in bytes (optional)
  acceptedMimeTypes?: string[];        // ["image/jpeg", "image/png"] (for images/docs)

  // Output configuration
  artifactType: string;                // "transcript", "xray_analysis", "vbg_report"
  artifactSchema: JSONSchema;          // Schema for artifact.content

  // Behavior
  canEnrichExisting: boolean;          // Can this skill add to existing artifacts?
  enrichableArtifactTypes: string[];   // Which artifact types can it enrich?

  // Pricing
  creditCost: number;                  // Credits for new_artifact intent
  enrichCost: number;                  // Credits for enrich_existing (usually 0)

  // Classification
  classificationPrompt: string;        // Prompt hints for the unified classifier
  autoDetectPatterns?: string[];       // Patterns that suggest this skill

  // Processing
  processorFunction: string;           // Edge function name: "process-transcription"
  timeoutMs: number;                   // Processing timeout

  // UI
  artifactIcon: string;                // Icon for artifact cards
  artifactActions: ArtifactAction[];   // Available actions (review, export, etc.)
}

type InputType = "audio" | "text" | "image" | "document" | "structured_data";

interface ArtifactAction {
  id: string;                          // "review", "export", "share"
  label: string;                       // "Review"
  icon?: string;
  availableOn: ("mobile" | "web")[];
}
```

## Built-in Skills

### Transcription Skill

Converts audio recordings into text transcripts.

```typescript
const transcriptionSkill: SkillDefinition = {
  id: "transcription",
  name: "Medical Transcription",
  description: "Convert audio recordings into structured medical transcripts",
  version: "1.0.0",

  inputTypes: ["audio"],
  maxInputSize: 100 * 1024 * 1024,     // 100MB
  acceptedMimeTypes: ["audio/aac", "audio/mp4", "audio/mpeg"],

  artifactType: "transcript",
  artifactSchema: transcriptSchema,    // See artifacts.md

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 1,
  enrichCost: 0,

  classificationPrompt: `
    Audio input containing spoken medical consultation notes.
    May include patient symptoms, examination findings, assessments, and plans.
  `,

  processorFunction: "process-transcription",
  timeoutMs: 300000,                   // 5 minutes

  artifactIcon: "FileText",
  artifactActions: [
    { id: "review", label: "Review", availableOn: ["mobile", "web"] },
    { id: "review_web", label: "Review on web", availableOn: ["mobile"] },
    { id: "export", label: "Export", availableOn: ["web"] },
    { id: "copy", label: "Copy", availableOn: ["web"] },
  ],
};
```

### Text Entry Skill

Processes direct text input (consultation notes, instructions, questions).

```typescript
const textEntrySkill: SkillDefinition = {
  id: "text_entry",
  name: "Text Input",
  description: "Process text input as consultation notes, instructions, or questions",
  version: "1.0.0",

  inputTypes: ["text"],
  maxInputSize: 50000,                 // ~50KB of text

  artifactType: "transcript",          // Produces same artifact type as transcription
  artifactSchema: transcriptSchema,

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 1,                       // Only for new_artifact intent
  enrichCost: 0,

  classificationPrompt: `
    Text input from practitioner. Could be:
    - Clinical content for documentation (new artifact or enrich existing)
    - Instruction to modify existing documentation
    - Question about documentation
  `,

  processorFunction: "process-text-entry",
  timeoutMs: 60000,                    // 1 minute

  artifactIcon: "FileText",
  artifactActions: [
    { id: "review", label: "Review", availableOn: ["mobile", "web"] },
    { id: "review_web", label: "Review on web", availableOn: ["mobile"] },
    { id: "export", label: "Export", availableOn: ["web"] },
  ],
};
```

## Future Skills (Templates)

These skill definitions are provided as templates for future implementation.

### X-Ray Analysis Skill

```typescript
const xrayAnalysisSkill: SkillDefinition = {
  id: "xray_analysis",
  name: "Chest X-Ray Analysis",
  description: "AI-assisted analysis of chest X-ray images",
  version: "1.0.0",

  inputTypes: ["image"],
  maxInputSize: 50 * 1024 * 1024,      // 50MB
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/dicom"],

  artifactType: "xray_analysis",
  artifactSchema: xrayAnalysisSchema,  // See below

  canEnrichExisting: true,             // Can add X-ray findings to existing transcript
  enrichableArtifactTypes: ["transcript"],

  creditCost: 2,                       // Higher cost for image analysis
  enrichCost: 1,

  classificationPrompt: `
    Image of a chest X-ray (CXR). Look for:
    - PA or lateral view chest radiograph
    - Medical imaging with lung fields visible
    - DICOM or standard image formats
  `,
  autoDetectPatterns: [
    "chest x-ray", "cxr", "chest radiograph", "lung x-ray"
  ],

  processorFunction: "process-xray-analysis",
  timeoutMs: 120000,                   // 2 minutes

  artifactIcon: "Scan",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
    { id: "export", label: "Export Report", availableOn: ["web"] },
  ],
};

// X-Ray analysis artifact schema
const xrayAnalysisSchema = {
  type: "object",
  properties: {
    imageUrl: { type: "string" },
    viewType: { type: "string", enum: ["PA", "lateral", "AP", "unknown"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          region: { type: "string" },          // "right_upper_lobe", "cardiac_silhouette"
          finding: { type: "string" },          // "consolidation", "cardiomegaly"
          severity: { type: "string", enum: ["normal", "mild", "moderate", "severe"] },
          confidence: { type: "number" },
          description: { type: "string" },
        }
      }
    },
    impression: { type: "string" },            // Overall impression
    recommendations: { type: "array", items: { type: "string" } },
    limitations: { type: "string" },           // Quality issues, limitations
  }
};
```

### VBG Analysis Skill

```typescript
const vbgAnalysisSkill: SkillDefinition = {
  id: "vbg_analysis",
  name: "VBG/ABG Analysis",
  description: "Analyze venous or arterial blood gas images and provide interpretation",
  version: "1.0.0",

  inputTypes: ["image", "structured_data"],
  maxInputSize: 10 * 1024 * 1024,      // 10MB
  acceptedMimeTypes: ["image/jpeg", "image/png"],

  artifactType: "vbg_analysis",
  artifactSchema: vbgAnalysisSchema,

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 1,
  enrichCost: 0,

  classificationPrompt: `
    Image of blood gas results (VBG or ABG) from a blood gas analyzer.
    Or structured data containing pH, pCO2, pO2, HCO3, BE values.
  `,
  autoDetectPatterns: [
    "vbg", "abg", "blood gas", "arterial gas", "venous gas"
  ],

  processorFunction: "process-vbg-analysis",
  timeoutMs: 60000,

  artifactIcon: "TestTube",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
  ],
};

const vbgAnalysisSchema = {
  type: "object",
  properties: {
    imageUrl: { type: "string" },
    values: {
      type: "object",
      properties: {
        pH: { type: "number" },
        pCO2: { type: "number" },
        pO2: { type: "number" },
        HCO3: { type: "number" },
        BE: { type: "number" },
        lactate: { type: "number" },
        // Additional values...
      }
    },
    interpretation: {
      type: "object",
      properties: {
        primaryDisorder: { type: "string" },   // "respiratory_acidosis", "metabolic_alkalosis"
        compensation: { type: "string" },       // "uncompensated", "partial", "full"
        oxygenation: { type: "string" },        // "normal", "hypoxic"
        anionGap: { type: "string" },           // "normal", "elevated"
      }
    },
    clinicalCorrelation: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  }
};
```

### ECG Analysis Skill (Template)

```typescript
const ecgAnalysisSkill: SkillDefinition = {
  id: "ecg_analysis",
  name: "ECG Analysis",
  description: "AI-assisted 12-lead ECG interpretation",
  version: "1.0.0",

  inputTypes: ["image"],
  acceptedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],

  artifactType: "ecg_analysis",

  canEnrichExisting: true,
  enrichableArtifactTypes: ["transcript"],

  creditCost: 2,
  enrichCost: 1,

  classificationPrompt: `
    12-lead ECG or rhythm strip image.
  `,
  autoDetectPatterns: ["ecg", "ekg", "electrocardiogram", "rhythm strip"],

  processorFunction: "process-ecg-analysis",
  timeoutMs: 120000,

  artifactIcon: "Activity",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
  ],
};
```

## Unified Classifier

The unified classifier determines the appropriate skill and intent for any input.

```typescript
interface ClassificationInput {
  inputType: InputType;
  content: string | Blob;              // Text content or file reference
  contentDescription?: string;         // User-provided description (optional)
  conversationId: string;
  conversationContext: {
    recentMessages: ConversationMessage[];
    existingArtifacts: Artifact[];
    hasActiveArtifact: boolean;
  };
  availableSkills: SkillDefinition[];
}

interface ClassificationResult {
  skillId: string;                     // Which skill to invoke
  intent: "new_artifact" | "enrich_existing" | "instruction" | "question";
  confidence: number;
  reasoning: string;

  // For enrich_existing intent
  targetArtifactId?: string;

  // For instruction intent
  suggestedAction?: string;
}
```

### Classification Prompt

```typescript
async function classifyInput(input: ClassificationInput): Promise<ClassificationResult> {
  const skillDescriptions = input.availableSkills
    .map(s => `- ${s.id}: ${s.description} (accepts: ${s.inputTypes.join(", ")})`)
    .join("\n");

  const prompt = `
You are classifying user input to determine the appropriate processing skill and intent.

Available skills:
${skillDescriptions}

Input type: ${input.inputType}
${input.inputType === "text" ? `Input content: "${input.content}"` : `File type: ${input.contentDescription || "unknown"}`}

Conversation context:
- Has existing artifacts: ${input.conversationContext.hasActiveArtifact}
- Recent messages: ${JSON.stringify(input.conversationContext.recentMessages.slice(-3))}

Determine:
1. Which skill should process this input?
2. What is the user's intent?
   - "new_artifact": Create a new standalone artifact (e.g., new transcription, new analysis)
   - "enrich_existing": Add information to an existing artifact (e.g., fragment to add to transcript)
   - "instruction": Command to modify existing documentation (e.g., "add diabetes to history")
   - "question": Query about existing documentation (e.g., "what medications did I document?")

Return JSON:
{
  "skillId": "skill_id",
  "intent": "new_artifact" | "enrich_existing" | "instruction" | "question",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "targetArtifactId": "uuid or null",
  "suggestedAction": "action type for instructions"
}
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

## Skill Router

Routes classified input to the appropriate skill processor.

```typescript
async function routeToSkill(
  classification: ClassificationResult,
  input: ClassificationInput
): Promise<void> {
  const skill = getSkillDefinition(classification.skillId);

  if (!skill) {
    throw new Error(`Unknown skill: ${classification.skillId}`);
  }

  // Validate input type
  if (!skill.inputTypes.includes(input.inputType)) {
    throw new Error(`Skill ${skill.id} does not accept ${input.inputType} input`);
  }

  // Check credits for new_artifact intent
  if (classification.intent === "new_artifact") {
    const hasCredit = await checkCredits(input.practitionerId, skill.creditCost);
    if (!hasCredit) {
      await createPendingCreditsMessage(input.conversationId, skill.creditCost);
      return;
    }
  }

  // Invoke the skill's edge function
  await invokeEdgeFunction(skill.processorFunction, {
    inputId: input.id,
    inputType: input.inputType,
    content: input.content,
    conversationId: input.conversationId,
    practitionerId: input.practitionerId,
    intent: classification.intent,
    targetArtifactId: classification.targetArtifactId,
  });
}
```

## Adding a New Skill

This section provides a complete guide for adding a new skill to the system. Use this as a checklist when implementing skills like X-ray analysis, VBG interpretation, ECG analysis, etc.

### Overview: Files to Touch

| File/Location | What to Add |
|---------------|-------------|
| `packages/@project/core/src/skills/` | Skill definition TypeScript file |
| `packages/@project/core/src/skills/index.ts` | Export the new skill |
| `spec/artifacts.md` | Document the artifact content schema |
| `supabase/functions/process-{skill}/` | Edge function for processing |
| `apps/mobile/components/` | UI components for artifact display (if needed) |
| `apps/web/components/` | UI components for artifact display (if needed) |

### Step 1: Define the Skill

Create a new file `packages/@project/core/src/skills/{skill-name}.ts`:

```typescript
// packages/@project/core/src/skills/xray-analysis.ts
import { SkillDefinition } from "./types";

export const xrayAnalysisSkill: SkillDefinition = {
  // Identity
  id: "xray_analysis",
  name: "Chest X-Ray Analysis",
  description: "AI-assisted analysis of chest X-ray images",
  version: "1.0.0",

  // Input configuration
  inputTypes: ["image"],
  maxInputSize: 50 * 1024 * 1024,      // 50MB
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/dicom"],

  // Output configuration
  artifactType: "xray_analysis",

  // Behavior
  canEnrichExisting: true,             // Can add findings to existing transcript
  enrichableArtifactTypes: ["transcript"],

  // Pricing
  creditCost: 2,                       // Credits for new analysis
  enrichCost: 1,                       // Credits to add to transcript

  // Classification hints for auto-detection
  classificationPrompt: `
    Image of a chest X-ray (CXR). Look for:
    - PA or lateral view chest radiograph
    - Medical imaging with lung fields visible
  `,
  autoDetectPatterns: ["chest x-ray", "cxr", "chest radiograph"],

  // Processing
  processorFunction: "process-xray-analysis",
  timeoutMs: 120000,                   // 2 minutes

  // UI
  artifactIcon: "Scan",
  artifactActions: [
    { id: "review", label: "Review Analysis", availableOn: ["mobile", "web"] },
    { id: "add_to_transcript", label: "Add to Notes", availableOn: ["mobile", "web"] },
    { id: "export", label: "Export Report", availableOn: ["web"] },
  ],
};
```

Register in `packages/@project/core/src/skills/index.ts`:

```typescript
export { xrayAnalysisSkill } from "./xray-analysis";
export { transcriptionSkill } from "./transcription";
export { textEntrySkill } from "./text-entry";

// Skill registry
export const skillRegistry = {
  transcription: transcriptionSkill,
  text_entry: textEntrySkill,
  xray_analysis: xrayAnalysisSkill,
};
```

### Step 2: Define the Artifact Schema

Document the artifact content schema in `spec/artifacts.md` and create TypeScript types:

```typescript
// packages/@project/core/src/artifacts/xray-analysis.ts
export interface XRayAnalysisContent {
  imageUrl: string;
  thumbnailUrl?: string;
  viewType: "PA" | "lateral" | "AP" | "unknown";

  findings: Array<{
    id: string;
    region: string;           // "right_upper_lobe", "cardiac_silhouette"
    finding: string;          // "consolidation", "cardiomegaly"
    severity: "normal" | "mild" | "moderate" | "severe";
    confidence: number;
    description: string;
  }>;

  impression: string;
  recommendations: string[];
  imageQuality: "good" | "adequate" | "limited";
  limitations?: string;
}
```

### Step 3: Implement the Edge Function

Create `supabase/functions/process-xray-analysis/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

serve(async (req) => {
  const {
    userInputId,
    inputType,
    storagePath,
    conversationId,
    practitionerId,
    intent,
    targetArtifactId,
  } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  });

  try {
    // 1. Get signed URL for the image
    const { data: signedUrl } = await supabase.storage
      .from("uploads")
      .createSignedUrl(storagePath, 3600);

    // 2. Analyze with Claude Vision
    const analysis = await analyzeXray(anthropic, signedUrl.signedUrl);

    // 3. Handle based on intent
    if (intent === "new_artifact") {
      // Create new artifact
      const { data: artifact } = await supabase
        .from("artifacts")
        .insert({
          practitioner_id: practitionerId,
          conversation_id: conversationId,
          skill_id: "xray_analysis",
          source_input_id: userInputId,
          artifact_type: "xray_analysis",
          content: analysis,
          summary: analysis.impression.substring(0, 100),
          status: "ready",
        })
        .select()
        .single();

      // Create conversation message
      await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        participant_type: "skill_ai",
        message_type: "artifact_created",
        content: `I've analyzed the chest X-ray. ${analysis.impression}`,
        metadata: {
          artifact_id: artifact.id,
          artifact_type: "xray_analysis",
          skill_id: "xray_analysis",
          user_input_id: userInputId,
          summary: analysis.impression,
          preview: {
            findings_count: analysis.findings.length,
            primary_finding: analysis.findings[0]?.finding,
          },
        },
      });

    } else if (intent === "enrich_existing") {
      // Add to existing transcript
      await enrichTranscriptWithXray(supabase, targetArtifactId, analysis);

      await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        participant_type: "assistant_ai",
        message_type: "artifact_updated",
        content: `Added X-ray findings to your notes: ${analysis.impression}`,
        metadata: {
          artifact_id: targetArtifactId,
          update_type: "reference_added",
          source_artifact_type: "xray_analysis",
        },
      });
    }

    // Update input status
    await supabase
      .from("user_inputs")
      .update({ status: "completed" })
      .eq("id", userInputId);

    return new Response(JSON.stringify({ status: "completed" }));

  } catch (error) {
    // Refund credits on failure
    await supabase.rpc("refund_skill_credits", {
      p_practitioner_id: practitionerId,
      p_user_input_id: userInputId,
      p_skill_id: "xray_analysis",
      p_credit_amount: intent === "new_artifact" ? 2 : 1,
    });

    await supabase
      .from("user_inputs")
      .update({ status: "failed", error_message: error.message })
      .eq("id", userInputId);

    throw error;
  }
});

async function analyzeXray(anthropic: Anthropic, imageUrl: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `Analyze this chest X-ray. Provide:
1. View type (PA, lateral, AP)
2. Findings by region with severity
3. Overall impression
4. Recommendations
5. Any image quality limitations

Return as JSON matching XRayAnalysisContent schema.`,
          },
        ],
      },
    ],
  });

  return JSON.parse(response.content[0].text);
}
```

### Step 4: Create UI Components (if needed)

For skills with specialized output, create artifact display components:

```typescript
// apps/mobile/components/artifacts/XRayArtifactCard.tsx
import { Artifact } from "@project/core/artifacts";
import { XRayAnalysisContent } from "@project/core/artifacts/xray-analysis";

export function XRayArtifactCard({ artifact }: { artifact: Artifact }) {
  const content = artifact.content as XRayAnalysisContent;

  return (
    <Card>
      <CardHeader>
        <Image source={{ uri: content.thumbnailUrl }} />
        <Text>X-Ray Analysis</Text>
      </CardHeader>
      <CardContent>
        <Text>{content.impression}</Text>
        <Text>{content.findings.length} findings</Text>
      </CardContent>
      <CardFooter>
        <Button onPress={() => openReview(artifact)}>Review Analysis</Button>
        <Button onPress={() => addToNotes(artifact)}>Add to Notes</Button>
      </CardFooter>
    </Card>
  );
}
```

### Step 5: Update the Classifier (if needed)

If your skill needs special classification logic beyond the auto-detect patterns, update the unified classifier:

```typescript
// In classify-input edge function
if (input.inputType === "image") {
  // Check for X-ray characteristics
  const isXray = await detectXrayImage(input.content);
  if (isXray) {
    return {
      skillId: "xray_analysis",
      intent: determineIntent(input),
      confidence: 0.9,
    };
  }
}
```

### Step 6: Test the Skill

1. **Unit tests**: Test the skill definition and artifact schema
2. **Integration tests**: Test the edge function with sample inputs
3. **E2E tests**: Test the full flow from upload to artifact display

### Checklist for New Skills

- [ ] Skill definition created in `@project/core/src/skills/`
- [ ] Skill exported from `@project/core/src/skills/index.ts`
- [ ] Artifact content schema documented in `spec/artifacts.md`
- [ ] Artifact TypeScript types created in `@project/core/src/artifacts/`
- [ ] Edge function created in `supabase/functions/process-{skill}/`
- [ ] Edge function handles both `new_artifact` and `enrich_existing` intents
- [ ] Edge function creates appropriate conversation messages
- [ ] Edge function handles credit usage and refunds on failure
- [ ] UI components created for artifact display (if non-standard)
- [ ] Classification hints added to skill definition
- [ ] Tests written for skill processor
- [ ] Documentation updated in `spec/` directory

## Credit Model

| Intent | Credit Usage |
|--------|--------------|
| `new_artifact` | `skill.creditCost` (typically 1-2) |
| `enrich_existing` | `skill.enrichCost` (typically 0) |
| `instruction` | 0 (free) |
| `question` | 0 (free) |

Skills can define different credit costs based on:
- Processing complexity (image analysis > text processing)
- External API costs (vision models > text models)
- Output value (comprehensive report > simple extraction)

## Related Specs

- [artifacts.md](./artifacts.md) - Unified artifact model and schemas
- [transcription.md](./transcription.md) - Transcription skill implementation
- [text-entry.md](./text-entry.md) - Text entry skill implementation
- [conversations.md](./conversations.md) - Conversation message integration
- [database.md](./database.md) - Skills and artifacts database schema
