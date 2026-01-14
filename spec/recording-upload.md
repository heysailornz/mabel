# Recording & Upload

Mobile audio recording, local storage, and resumable upload architecture.

## Audio Format

- **Format:** AAC (mono, 128kbps)
- **File size:** ~1 MB per minute of recording
- **Typical consultation (30 min):** ~30 MB

## Mobile App Libraries

- `expo-av` - Audio recording (AAC format, mono 128kbps)
- `expo-file-system` - Local file management
- `tus-js-client` - TUS resumable uploads to Supabase Storage
- `react-native-mmkv` - Offline queue persistence

## Upload Method: TUS Resumable Uploads

Supabase Storage supports the TUS protocol for resumable uploads, ideal for mobile networks:

- Uploads in 6MB chunks
- Automatic retry on failure
- Can pause/resume uploads
- Resume from where it left off after network interruption
- Supports files up to 50GB

## Upload Time Estimates

| Duration | File Size | 4G LTE  | 3G     | Poor Signal |
| -------- | --------- | ------- | ------ | ----------- |
| 15 min   | ~15 MB    | ~6 sec  | ~1 min | ~4 min      |
| 30 min   | ~30 MB    | ~12 sec | ~2 min | ~8 min      |
| 60 min   | ~60 MB    | ~24 sec | ~4 min | ~16 min     |

## Upload Flow

```
Recording Complete
       │
       ▼
Save to local storage (expo-file-system)
       │
       ▼
Add to upload queue (MMKV)
       │
       ▼
Queue manager checks connectivity
       │
       ├── Offline: Wait for connection
       │
       └── Online: Start TUS upload
                │
                ├── Create recordings DB row (status='uploading')
                │
                ├── TUS resumable upload to Supabase Storage
                │   └── Uses direct storage URL for better performance
                │
                ├── On success: Update status='pending'
                │
                └── On failure: Keep in queue, retry with backoff
```

## TUS Upload Implementation

```typescript
import * as tus from "tus-js-client";
import * as FileSystem from "expo-file-system";

async function uploadRecording(
  fileUri: string,
  fileName: string,
  practitionerId: string,
  accessToken: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const supabaseStorageUrl = SUPABASE_URL.replace(
    ".supabase.co",
    ".storage.supabase.co"
  );

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileUri, {
      endpoint: `${supabaseStorageUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: "recordings",
        objectName: `${practitionerId}/${fileName}`,
        contentType: "audio/aac",
      },
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      uploadSize: fileInfo.size,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress((bytesUploaded / bytesTotal) * 100);
      },
      onSuccess: () => resolve(`${practitionerId}/${fileName}`),
    });

    // Resume previous upload if interrupted
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}
```

## Offline Queue Structure (MMKV)

```typescript
interface QueuedRecording {
  id: string;                 // Local UUID
  fileUri: string;            // Local file path
  fileName: string;           // Target filename
  practitionerId: string;
  conversationId: string;     // Linked conversation
  durationSeconds: number;
  createdAt: string;          // ISO timestamp
  uploadAttempts: number;     // Retry counter
  lastAttemptAt?: string;     // For exponential backoff
  tusUploadUrl?: string;      // For resuming partial uploads
}
```

## Queue Manager

```typescript
class UploadQueueManager {
  private queue: QueuedRecording[] = [];
  private isProcessing = false;

  async addToQueue(recording: QueuedRecording) {
    this.queue.push(recording);
    this.persistQueue();
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || !this.isOnline()) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const recording = this.queue[0];

      try {
        await this.uploadRecording(recording);
        this.queue.shift();
        this.persistQueue();
      } catch (error) {
        recording.uploadAttempts++;
        recording.lastAttemptAt = new Date().toISOString();
        this.persistQueue();

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, recording.uploadAttempts), 60000);
        await this.wait(delay);
      }
    }

    this.isProcessing = false;
  }

  private persistQueue() {
    storage.set('uploadQueue', JSON.stringify(this.queue));
  }

  private loadQueue() {
    const saved = storage.getString('uploadQueue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }
}
```

## Recording Controls

### expo-av Configuration

```typescript
import { Audio } from 'expo-av';

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.aac',
    outputFormat: Audio.AndroidOutputFormat.AAC_ADTS,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.aac',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};
```

### Recording Hook

```typescript
function useRecording() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused'>('idle');

  async function startRecording(conversationId?: string) {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    setRecording(recording);
    setStatus('recording');

    // Update duration every second
    recording.setOnRecordingStatusUpdate((status) => {
      setDuration(Math.floor(status.durationMillis / 1000));
    });

    return recording;
  }

  async function stopRecording() {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setStatus('idle');

    return { uri, duration };
  }

  async function pauseRecording() {
    await recording?.pauseAsync();
    setStatus('paused');
  }

  async function resumeRecording() {
    await recording?.startAsync();
    setStatus('recording');
  }

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    duration,
    status,
  };
}
```

## Storage Bucket Configuration

```sql
-- Create recordings bucket
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);

-- Upload policy: users can upload to their own folder
CREATE POLICY "recordings_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Read policy: users can read their own recordings
CREATE POLICY "recordings_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Service role can read all (for edge functions)
CREATE POLICY "recordings_service_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    auth.role() = 'service_role'
  );
```

## Storage Trigger

Trigger processing when upload completes:

```sql
-- This would typically be set up via Supabase dashboard
-- or using a webhook on storage.objects insert
```

The edge function is triggered via database webhook or storage trigger when a new file is uploaded to the `recordings` bucket.

## Related Specs

- [conversations.md](./conversations.md) - How recordings integrate with conversations
- [transcription.md](./transcription.md) - Processing pipeline after upload
- [database.md](./database.md) - Recordings table schema
