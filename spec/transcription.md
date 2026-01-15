# Transcription Service (Skill Implementation)

AI-powered transcription pipeline with Deepgram and Claude. Supports both audio recordings and direct text entry.

## Skill Definition

This document describes the **transcription skill** - the first and primary skill in the Mabel system. See [skills.md](./skills.md) for the overall skills architecture and [artifacts.md](./artifacts.md) for the artifact model.

```typescript
// Skill registration (see skills.md for full schema)
const transcriptionSkill = {
  id: "transcription",
  name: "Medical Transcription",
  inputTypes: ["audio", "text"],
  artifactType: "transcript",
  creditCost: 1,
  canEnrichExisting: true,
  processorFunction: "process-transcription",
};
```

## Architecture Overview

The system accepts two input types that converge into a shared processing pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   AUDIO RECORDING │           │    TEXT ENTRY     │
        │                   │           │                   │
        │  Local Recording  │           │   classify-text   │
        │  + Offline Queue  │           │   (AI classifier) │
        │        │          │           │        │          │
        │        ▼          │           │        ▼          │
        │  Supabase Storage │           │   Route by type:  │
        │  (TUS upload)     │           │   - consultation  │
        │        │          │           │   - instruction   │
        │        ▼          │           │   - fragment      │
        │  process-recording│           │   - question      │
        │        │          │           │        │          │
        │        ▼          │           │        │          │
        │    Deepgram API   │           │        │          │
        │   (speech-to-text)│           │        │          │
        └────────┬──────────┘           └────────┬──────────┘
                 │                               │
                 │    ┌──────────────────────────┘
                 │    │ (consultation/fragment only)
                 ▼    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED PROCESSING PIPELINE                                │
│                                                                              │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│   │   Enhancement    │───►│     Summary      │───►│   Suggestions    │      │
│   │  (vocabulary     │    │   Generation     │    │    Engine        │      │
│   │   corrections)   │    │    (Claude)      │    │    (Claude)      │      │
│   └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Save to transcripts table   │
                    │   Add conversation messages   │
                    └───────────────────────────────┘
```

**Key distinction:** Audio recordings always flow through Deepgram first, while text entries skip speech-to-text and go directly to enhancement. Instructions and questions bypass the transcript pipeline entirely and are handled conversationally.

For detailed text entry processing (classification, instruction handling, fragments), see [text-entry.md](./text-entry.md).

## Audio Recording Pipeline

```
Mobile App
    │
    ▼
Local Recording + Offline Queue
    │
    ▼ (when online)
Supabase Storage (audio upload)
    │
    ▼
Edge Function: process-recording
    │
    ├──► Deepgram API (speech-to-text)
    │         │
    │         ▼
    │    Raw transcript
    │
    ├──► Custom Enhancement (vocabulary corrections)
    │         │
    │         ▼
    │    Enhanced transcript
    │
    ├──► Summary Generation (Claude)
    │         │
    │         ▼
    │    One-sentence summary
    │
    └──► Suggestion Engine (Claude)
              │
              ▼
         Suggestions JSON
              │
              ▼
    Save to transcripts table
    Add conversation messages
```

## Deepgram Integration

```typescript
async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  const response = await fetch("https://api.deepgram.com/v1/listen", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: audioUrl,
      model: "medical",
      punctuate: true,
      diarize: true,       // Speaker identification
      smart_format: true,
    }),
  });

  const result = await response.json();
  return {
    transcript: result.results.channels[0].alternatives[0].transcript,
    confidence: result.results.channels[0].alternatives[0].confidence,
    words: result.results.channels[0].alternatives[0].words,
  };
}
```

## Custom Enhancement Layer

Apply practitioner's vocabulary corrections:

```typescript
async function enhanceTranscript(
  rawText: string,
  practitionerId: string
): Promise<string> {
  // Fetch practitioner's custom vocabulary
  const { data: vocabulary } = await supabase
    .from("vocabulary")
    .select("original_term, corrected_term")
    .eq("practitioner_id", practitionerId);

  let enhanced = rawText;

  // Apply vocabulary corrections
  for (const { original_term, corrected_term } of vocabulary || []) {
    const regex = new RegExp(`\\b${escapeRegex(original_term)}\\b`, "gi");
    enhanced = enhanced.replace(regex, corrected_term);
  }

  return enhanced;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

## Summary Generation

One-sentence summary for list display:

```typescript
async function generateSummary(transcript: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Summarize this medical consultation in one sentence (max 15 words) for display in a list view. Focus on the main complaint or reason for visit.

Transcript:
${transcript}`,
      },
    ],
  });

  return response.content[0].text;
}
```

## Suggestion Engine

Identify missing documentation elements:

```typescript
interface Suggestion {
  type: "missing_element";
  element: string;
  message: string;
  suggested_text: string;
}

async function generateSuggestions(transcript: string): Promise<Suggestion[]> {
  const prompt = `
You are a medical documentation assistant. Analyze this consultation transcript and identify any missing required elements.

Transcript:
${transcript}

Check for these common elements:
1. Chief complaint
2. History of present illness (onset, duration, severity, associated symptoms)
3. Relevant past medical history
4. Current medications mentioned
5. Physical examination findings
6. Assessment/diagnosis
7. Plan (medications, referrals, follow-up)

Return a JSON array of suggestions:
[
  {
    "type": "missing_element",
    "element": "follow_up",
    "message": "No follow-up timeframe specified",
    "suggested_text": "Follow up in [X] weeks"
  }
]

Only include genuinely missing or unclear elements. Return empty array if documentation is complete.
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    return [];
  }
}
```

## Edge Function: process-recording

Complete processing pipeline:

```typescript
// supabase/functions/process-recording/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

serve(async (req) => {
  const { recordingId, practitionerId, conversationId, audioPath } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  });

  try {
    // 1. Check/use credit
    const { data: hasCredit } = await supabase.rpc("use_credit", {
      p_practitioner_id: practitionerId,
      p_recording_id: recordingId,
    });

    if (!hasCredit) {
      await supabase
        .from("recordings")
        .update({ status: "pending_credits" })
        .eq("id", recordingId);
      return new Response(JSON.stringify({ status: "pending_credits" }));
    }

    // 2. Get signed URL for audio
    const { data: signedUrl } = await supabase.storage
      .from("recordings")
      .createSignedUrl(audioPath, 3600);

    // 3. Transcribe with Deepgram
    const transcription = await transcribeAudio(signedUrl.signedUrl);

    // 4. Enhance with vocabulary
    const enhancedText = await enhanceTranscript(
      transcription.transcript,
      practitionerId
    );

    // 5. Generate summary
    const summary = await generateSummary(enhancedText);

    // 6. Generate suggestions
    const suggestions = await generateSuggestions(enhancedText);

    // 7. Create transcript record
    const { data: transcript } = await supabase
      .from("transcripts")
      .insert({
        recording_id: recordingId,
        raw_text: transcription.transcript,
        enhanced_text: enhancedText,
        summary,
        suggestions,
      })
      .select()
      .single();

    // 8. Add conversation messages
    await addProcessingMessages(
      conversationId,
      recordingId,
      transcript.id,
      {
        enhanced_text: enhancedText,
        raw_text: transcription.transcript,
        summary,
        suggestions,
        confidence: transcription.confidence,
      }
    );

    // 9. Update recording status
    await supabase
      .from("recordings")
      .update({ status: "completed" })
      .eq("id", recordingId);

    return new Response(JSON.stringify({ status: "completed" }));

  } catch (error) {
    // Refund credit on failure
    await supabase.rpc("refund_credit", {
      p_practitioner_id: practitionerId,
      p_recording_id: recordingId,
    });

    await supabase
      .from("recordings")
      .update({ status: "failed" })
      .eq("id", recordingId);

    throw error;
  }
});
```

## Credit Check Integration

```typescript
// Check credits before processing
const hasCredit = await supabase.rpc("use_credit", {
  p_practitioner_id: practitionerId,
  p_recording_id: recordingId,
});

if (!hasCredit) {
  await supabase
    .from("recordings")
    .update({ status: "pending_credits" })
    .eq("id", recordingId);
  return; // Exit, recording will be processed when credits purchased
}

try {
  // Process transcription...
} catch (error) {
  // Refund credit on failure
  await supabase.rpc("refund_credit", {
    p_practitioner_id: practitionerId,
    p_recording_id: recordingId,
  });
  throw error;
}
```

## Environment Variables

```env
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Related Specs

- [text-entry.md](./text-entry.md) - Text input classification and processing
- [recording-upload.md](./recording-upload.md) - Upload triggers processing
- [conversations.md](./conversations.md) - Message creation after processing
- [learning-pipeline.md](./learning-pipeline.md) - Vocabulary corrections
- [payments.md](./payments.md) - Credit system
