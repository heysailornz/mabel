# Learning Pipeline

Track corrections to build a vocabulary dictionary that improves transcription accuracy.

## Overview

When practitioners edit transcripts, the system extracts corrections and stores them in a per-practitioner vocabulary dictionary. These corrections are automatically applied to future transcriptions.

## Correction Tracking

When a practitioner saves an edited transcript:

```typescript
async function saveTranscript(
  transcriptId: string,
  editedText: string,
  originalText: string,
  practitionerId: string
) {
  // Save the edit
  await supabase
    .from("transcripts")
    .update({
      edited_text: editedText,
      updated_at: new Date(),
    })
    .eq("id", transcriptId);

  // Extract vocabulary corrections
  const corrections = extractCorrections(originalText, editedText);

  for (const { original, corrected } of corrections) {
    await supabase.from("vocabulary").upsert(
      {
        practitioner_id: practitionerId,
        original_term: original,
        corrected_term: corrected,
      },
      {
        onConflict: "practitioner_id, original_term",
      }
    );
  }
}
```

## Correction Extraction

Use diff algorithms to identify word-level changes:

```typescript
interface Correction {
  original: string;
  corrected: string;
}

function extractCorrections(
  originalText: string,
  editedText: string
): Correction[] {
  const corrections: Correction[] = [];

  // Tokenize both texts
  const originalWords = tokenize(originalText);
  const editedWords = tokenize(editedText);

  // Use longest common subsequence to find differences
  const diff = computeDiff(originalWords, editedWords);

  // Extract substitutions (word replaced with another)
  for (const change of diff) {
    if (change.type === 'substitution') {
      // Only track if it looks like a terminology correction
      if (isLikelyTerminologyCorrection(change.original, change.replacement)) {
        corrections.push({
          original: change.original,
          corrected: change.replacement,
        });
      }
    }
  }

  return corrections;
}

function isLikelyTerminologyCorrection(original: string, corrected: string): boolean {
  // Skip if too different (likely not a term correction)
  const similarity = levenshteinSimilarity(original, corrected);
  if (similarity < 0.5) return false;

  // Skip common typos vs medical terms
  // (e.g., "the" -> "them" is not a terminology correction)
  if (isCommonWord(original) && isCommonWord(corrected)) return false;

  return true;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}
```

## Vocabulary Table

```sql
create table vocabulary (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  original_term text not null,  -- What transcription API produces
  corrected_term text not null, -- What practitioner corrects it to
  frequency integer default 1,  -- How often this correction was made
  created_at timestamptz default now(),
  UNIQUE(practitioner_id, original_term)
);
```

## Applying Corrections

During transcription enhancement (see [transcription.md](./transcription.md)):

```typescript
async function enhanceTranscript(
  rawText: string,
  practitionerId: string
): Promise<string> {
  // Fetch practitioner's custom vocabulary
  const { data: vocabulary } = await supabase
    .from("vocabulary")
    .select("original_term, corrected_term")
    .eq("practitioner_id", practitionerId)
    .order("frequency", { ascending: false }); // Most common first

  let enhanced = rawText;

  // Apply vocabulary corrections
  for (const { original_term, corrected_term } of vocabulary || []) {
    // Word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${escapeRegex(original_term)}\\b`, "gi");
    enhanced = enhanced.replace(regex, corrected_term);
  }

  return enhanced;
}
```

## Frequency Tracking

Update frequency when same correction is made again:

```typescript
await supabase
  .from("vocabulary")
  .upsert(
    {
      practitioner_id: practitionerId,
      original_term: original,
      corrected_term: corrected,
      frequency: 1,
    },
    {
      onConflict: "practitioner_id, original_term",
      count: "exact",
    }
  )
  .select();

// Then increment if exists
await supabase
  .from("vocabulary")
  .update({ frequency: supabase.raw("frequency + 1") })
  .eq("practitioner_id", practitionerId)
  .eq("original_term", original);
```

Or use a database function:

```sql
create or replace function upsert_vocabulary(
  p_practitioner_id uuid,
  p_original_term text,
  p_corrected_term text
) returns void as $$
begin
  insert into vocabulary (practitioner_id, original_term, corrected_term, frequency)
  values (p_practitioner_id, p_original_term, p_corrected_term, 1)
  on conflict (practitioner_id, original_term)
  do update set
    corrected_term = excluded.corrected_term,
    frequency = vocabulary.frequency + 1;
end;
$$ language plpgsql security definer set search_path = '';
```

## Vocabulary Management UI

Allow practitioners to view and manage their vocabulary:

```typescript
// Settings page component
function VocabularyManager() {
  const { data: vocabulary } = useVocabulary();

  async function deleteEntry(id: string) {
    await supabase.from("vocabulary").delete().eq("id", id);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Original</TableHead>
          <TableHead>Corrected</TableHead>
          <TableHead>Uses</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vocabulary?.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.original_term}</TableCell>
            <TableCell>{entry.corrected_term}</TableCell>
            <TableCell>{entry.frequency}</TableCell>
            <TableCell>
              <Button variant="ghost" onClick={() => deleteEntry(entry.id)}>
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Common Medical Term Corrections

Examples of corrections the system might learn:

| Original (Transcribed) | Corrected |
|------------------------|-----------|
| "lie sin oh prill" | "Lisinopril" |
| "metro pro lol" | "Metoprolol" |
| "high per tension" | "hypertension" |
| "a fib" | "AFib" |
| "echo cardiogram" | "echocardiogram" |

## Privacy Considerations

- Vocabulary data is per-practitioner (RLS protected)
- No patient-identifying information should be stored in vocabulary
- System only learns terminology, not clinical details

## Related Specs

- [transcription.md](./transcription.md) - Where vocabulary is applied
- [database.md](./database.md) - Vocabulary table schema
