# Text Entry Processing

Users can submit text directly in addition to audio recordings. The system uses AI to classify the intent and route through the appropriate processing path.

## Integration with Skills Architecture

Text entry processing is part of the unified skills architecture. See [skills.md](./skills.md) for the overall architecture.

**Key integration points:**
- Text inputs create a `user_inputs` record with `input_type: "text"`
- The classifier (described below) is a **subset** of the unified classifier in skills.md
- For text classified as `consultation`, processing routes to the `transcription` skill
- The output is a `transcript` artifact (see [artifacts.md](./artifacts.md))

When future skills are added (e.g., structured data entry), the classifier will be extended to detect and route to those skills as well.

## Input Classification

All text input goes through a classification step before processing. The AI determines intent automatically - there is no explicit mode toggle.

### Classification Types

| Type | Description | Example |
|------|-------------|---------|
| `consultation` | Clinical content to be documented | "Patient presents with chest pain, 3 days duration, worse with exertion" |
| `instruction` | Command to modify existing documentation | "Add that patient has history of diabetes" |
| `fragment` | Additional info to append to existing transcript | "Oh and also mention the headaches started last week" |
| `question` | Query about the documentation | "What medications did I document?" |

### Classification Confidence

The classifier returns a confidence score. Thresholds:

| Confidence | Action |
|------------|--------|
| ≥ 0.85 | Proceed automatically |
| 0.60 - 0.84 | Proceed but may ask clarifying question if ambiguous |
| < 0.60 | Ask user to clarify intent |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│                    (single text field, no mode toggle)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLASSIFY TEXT ENTRY                                  │
│                          (Claude classifier)                                 │
│                                                                              │
│   Input: raw_text, conversation_context (recent messages, transcripts)       │
│   Output: { type, confidence, reasoning }                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐
│  CONSULTATION   │    │    FRAGMENT     │    │   INSTRUCTION / QUESTION    │
│    CONTENT      │    │                 │    │                             │
└────────┬────────┘    └────────┬────────┘    └──────────────┬──────────────┘
         │                      │                            │
         ▼                      ▼                            ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐
│   Enhancement   │    │  Merge into     │    │      Context Loading        │
│  (vocabulary)   │    │  latest         │    │  (transcripts, suggestions, │
│                 │    │  transcript     │    │   edit history)             │
└────────┬────────┘    └────────┬────────┘    └──────────────┬──────────────┘
         │                      │                            │
         ▼                      ▼                            ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐
│    Summary +    │    │   Regenerate    │    │     Execute Action          │
│   Suggestions   │    │   suggestions   │    │  (edit, accept, clarify,    │
│                 │    │   if needed     │    │   answer question)          │
└────────┬────────┘    └────────┬────────┘    └──────────────┬──────────────┘
         │                      │                            │
         ▼                      ▼                            ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐
│ text_processed  │    │ fragment_merged │    │   instruction_response      │
│    message      │    │    message      │    │       message               │
└─────────────────┘    └─────────────────┘    └─────────────────────────────┘
```

## Edge Function: classify-text-entry

Classifies user text input to determine processing path.

```typescript
interface ClassificationInput {
  text: string;
  conversationId: string;
  recentMessages: ConversationMessage[]; // Last 10 messages for context
  hasExistingTranscript: boolean;
}

interface ClassificationResult {
  type: "consultation" | "instruction" | "fragment" | "question";
  confidence: number;
  reasoning: string;
  suggestedAction?: string; // For instructions: what action to take
}

async function classifyTextEntry(input: ClassificationInput): Promise<ClassificationResult> {
  const prompt = `
You are a medical documentation assistant. Classify this text input from a healthcare practitioner.

Context:
- Conversation has existing transcript: ${input.hasExistingTranscript}
- Recent messages: ${JSON.stringify(input.recentMessages.slice(-5))}

User input:
"${input.text}"

Classify as ONE of:
1. "consultation" - This is clinical content to be documented (patient symptoms, findings, assessments, plans)
2. "instruction" - This is a command to modify documentation (add something, change something, accept a suggestion)
3. "fragment" - This is additional clinical info to append to an existing transcript (only valid if hasExistingTranscript is true)
4. "question" - This is asking about the documentation content

For "instruction" type, also identify the specific action:
- "add_content" - Add new information to transcript
- "edit_content" - Modify existing information
- "accept_suggestion" - Accept a pending suggestion (identify which one)
- "reject_suggestion" - Dismiss a suggestion
- "regenerate" - Ask for new suggestions or re-process
- "clarify" - Asking for clarification (actually a question)

Return JSON:
{
  "type": "consultation" | "instruction" | "fragment" | "question",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "suggestedAction": "action_type" // Only for instruction type
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

## Processing Paths

### Path 1: Consultation Content

When text is classified as consultation content, it follows a similar pipeline to audio transcriptions but skips the Deepgram step.

```typescript
async function processConsultationText(
  text: string,
  practitionerId: string,
  conversationId: string
): Promise<void> {
  // 1. Check/use credit (same as audio)
  const hasCredit = await supabase.rpc("use_credit", {
    p_practitioner_id: practitionerId,
    p_text_entry_id: textEntryId,
  });

  if (!hasCredit) {
    await createPendingCreditsMessage(conversationId, textEntryId);
    return;
  }

  // 2. Enhancement (vocabulary corrections)
  const enhancedText = await enhanceTranscript(text, practitionerId);

  // 3. Summary generation
  const summary = await generateSummary(enhancedText);

  // 4. Suggestions
  const suggestions = await generateSuggestions(enhancedText);

  // 5. Create transcript record (source_type: 'text')
  const { data: transcript } = await supabase
    .from("transcripts")
    .insert({
      text_entry_id: textEntryId,
      raw_text: text,
      enhanced_text: enhancedText,
      summary,
      suggestions,
      source_type: "text",
    })
    .select()
    .single();

  // 6. Add conversation messages
  await addTextProcessedMessages(conversationId, textEntryId, transcript);
}
```

### Path 2: Fragment

When text is classified as a fragment, it's merged into the most recent transcript.

```typescript
async function processFragment(
  text: string,
  practitionerId: string,
  conversationId: string
): Promise<void> {
  // 1. Find most recent transcript in conversation
  const { data: latestTranscript } = await supabase
    .from("transcripts")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestTranscript) {
    // No existing transcript - treat as consultation content instead
    return processConsultationText(text, practitionerId, conversationId);
  }

  // 2. Enhance the fragment
  const enhancedFragment = await enhanceTranscript(text, practitionerId);

  // 3. Merge into existing transcript
  const mergedText = `${latestTranscript.enhanced_text}\n\n[Additional notes]\n${enhancedFragment}`;

  // 4. Update transcript
  await supabase
    .from("transcripts")
    .update({
      enhanced_text: mergedText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", latestTranscript.id);

  // 5. Regenerate suggestions for merged content
  const newSuggestions = await generateSuggestions(mergedText);

  await supabase
    .from("transcripts")
    .update({ suggestions: newSuggestions })
    .eq("id", latestTranscript.id);

  // 6. Add fragment_merged message
  await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    participant_type: "assistant_ai",
    message_type: "fragment_merged",
    content: `Added to your transcript: "${enhancedFragment.substring(0, 100)}${enhancedFragment.length > 100 ? "..." : ""}"`,
    metadata: {
      fragment_text: enhancedFragment,
      transcript_id: latestTranscript.id,
      suggestions_updated: newSuggestions.length > 0,
    },
  });
}
```

### Path 3: Instruction

When text is classified as an instruction, the system loads context and executes the appropriate action.

```typescript
interface InstructionContext {
  transcripts: Transcript[];
  pendingSuggestions: Suggestion[];
  recentEdits: ConversationMessage[];
}

async function processInstruction(
  text: string,
  action: string,
  conversationId: string,
  practitionerId: string
): Promise<void> {
  // 1. Load full context
  const context = await loadInstructionContext(conversationId);

  // 2. Execute action based on classification
  switch (action) {
    case "add_content":
      await executeAddContent(text, context, conversationId);
      break;

    case "edit_content":
      await executeEditContent(text, context, conversationId);
      break;

    case "accept_suggestion":
      await executeAcceptSuggestion(text, context, conversationId);
      break;

    case "reject_suggestion":
      await executeRejectSuggestion(text, context, conversationId);
      break;

    case "regenerate":
      await executeRegenerate(context, conversationId);
      break;

    default:
      // Fallback: use Claude to interpret and execute
      await executeWithClaude(text, context, conversationId);
  }
}

async function executeAddContent(
  instruction: string,
  context: InstructionContext,
  conversationId: string
): Promise<void> {
  const latestTranscript = context.transcripts[0];

  // Use Claude to determine what content to add and where
  const prompt = `
You are editing a medical transcript based on a practitioner's instruction.

Current transcript:
${latestTranscript.enhanced_text}

Instruction: "${instruction}"

Return JSON with the updated transcript and a brief description of what was added:
{
  "updatedText": "...",
  "description": "Added X to the Y section"
}
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const { updatedText, description } = JSON.parse(response.content[0].text);

  // Update transcript
  await supabase
    .from("transcripts")
    .update({ enhanced_text: updatedText })
    .eq("id", latestTranscript.id);

  // Add instruction_response message
  await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    participant_type: "assistant_ai",
    message_type: "instruction_response",
    content: `Done. ${description}`,
    metadata: {
      instruction: instruction,
      action: "add_content",
      transcript_id: latestTranscript.id,
    },
  });
}
```

### Path 4: Question

When text is classified as a question, Claude answers based on the documentation context.

```typescript
async function processQuestion(
  question: string,
  conversationId: string
): Promise<void> {
  const context = await loadInstructionContext(conversationId);

  const prompt = `
You are a medical documentation assistant. Answer this question about the current documentation.

Current transcript:
${context.transcripts[0]?.enhanced_text || "(No transcript yet)"}

Pending suggestions:
${JSON.stringify(context.pendingSuggestions)}

Question: "${question}"

Provide a helpful, concise answer.
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    participant_type: "assistant_ai",
    message_type: "instruction_response",
    content: response.content[0].text,
    metadata: {
      instruction: question,
      action: "answer_question",
    },
  });
}
```

## Edge Function: process-text-entry

Main entry point for text processing.

```typescript
// supabase/functions/process-text-entry/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

serve(async (req) => {
  const { text, conversationId, practitionerId, messageId } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  });

  try {
    // 1. Load conversation context for classification
    const { data: recentMessages } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: transcripts } = await supabase
      .from("transcripts")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(1);

    // 2. Classify the input
    const classification = await classifyTextEntry({
      text,
      conversationId,
      recentMessages: recentMessages || [],
      hasExistingTranscript: (transcripts?.length || 0) > 0,
    });

    // 3. Update the text_entry message with classification
    await supabase
      .from("conversation_messages")
      .update({
        metadata: {
          classification,
          status: "processing",
        },
      })
      .eq("id", messageId);

    // 4. Route to appropriate processor
    switch (classification.type) {
      case "consultation":
        await processConsultationText(text, practitionerId, conversationId);
        break;

      case "fragment":
        await processFragment(text, practitionerId, conversationId);
        break;

      case "instruction":
        await processInstruction(
          text,
          classification.suggestedAction || "unknown",
          conversationId,
          practitionerId
        );
        break;

      case "question":
        await processQuestion(text, conversationId);
        break;
    }

    // 5. Update message status to completed
    await supabase
      .from("conversation_messages")
      .update({
        metadata: {
          classification,
          status: "completed",
        },
      })
      .eq("id", messageId);

    return new Response(JSON.stringify({ status: "completed", classification }));

  } catch (error) {
    // Update message status to failed
    await supabase
      .from("conversation_messages")
      .update({
        metadata: {
          status: "failed",
          error: error.message,
        },
      })
      .eq("id", messageId);

    throw error;
  }
});
```

## UI Integration

### Text Input Component

The recording bar should include a text input option. The mic button transforms to a send button when text is entered.

```
┌────────────────────────────────────────────────────────┐
│  Type or record your notes...              🎤 │ ➤     │
└────────────────────────────────────────────────────────┘
     ↑                                        ↑     ↑
   Placeholder                             Record  Send
                                          (default) (when text entered)
```

**Behavior:**
- Empty field: Show mic button (🎤) - tap to record
- Text entered: Show send button (➤) - tap to submit text
- Can switch freely between typing and recording
- Send button is orange accent color when active

### Text Entry Message Display

Text entries from the user appear as right-aligned bubbles (same as recordings):

```
                                    ┌─────────────────────┐
                                    │ Patient has chest   │
                                    │ pain for 3 days     │
                                    └─────────────────────┘
                                                        ✓✓
```

### Processing States

Text entries follow similar status indicators as recordings:

| Status | Visual | Description |
|--------|--------|-------------|
| `sent` | ✓ (one grey tick) | Text submitted |
| `classifying` | ✓ (one grey tick, animated) | AI determining intent |
| `processing` | ✓✓ (two grey ticks) | Processing based on classification |
| `completed` | ✓✓ (two blue ticks) | Fully processed |
| `failed` | ✗ (red cross) + Retry | Error occurred |

## Edge Cases

### Mixed Input Detection

If a single input contains both consultation content AND an instruction:
```
"Patient has diabetes. Also add that to the history section."
```

The classifier should:
1. Identify this as primarily `instruction` with embedded content
2. Extract the content ("Patient has diabetes")
3. Execute the action (add to history section)

### No Existing Transcript

If user submits a `fragment` or `instruction` but no transcript exists:
- `fragment` → Treat as `consultation` (create new transcript)
- `instruction` to edit → Respond with clarification: "There's no transcript yet. Would you like me to create one with this information?"

### Ambiguous Instructions

If the instruction is unclear (e.g., "fix that"):
1. Ask clarifying question: "What would you like me to fix? The medications, the assessment, or something else?"
2. Store as `clarification_request` message
3. Wait for user response before proceeding

### Rapid Sequential Inputs

If user submits multiple texts quickly:
- Queue them in order
- Process sequentially (not in parallel) to maintain context coherence
- Each input sees the result of previous inputs in its context

## Credit Usage

| Action | Credit Cost |
|--------|-------------|
| Consultation content (new transcript) | 1 credit |
| Fragment (append to existing) | 0 credits |
| Instruction (edit, accept, etc.) | 0 credits |
| Question | 0 credits |

Only creating new standalone transcriptions costs credits. Modifications and queries are free.

## Related Specs

- [transcription.md](./transcription.md) - Audio processing pipeline (text reuses enhancement/summary/suggestion steps)
- [conversations.md](./conversations.md) - Message types and conversation flow
- [database.md](./database.md) - Schema for text entries
- [learning-pipeline.md](./learning-pipeline.md) - Vocabulary corrections (applied to text entries too)
