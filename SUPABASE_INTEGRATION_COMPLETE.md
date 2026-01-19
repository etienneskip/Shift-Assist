
# Supabase Integration Complete ✅

## Configuration

Your Supabase credentials have been configured in `app.json`:

- **Supabase URL**: `https://iyqkiccrneurfpxkkkick.supabase.co`
- **Anon Key**: Configured ✓
- **RLS**: Enabled on all tables ✓
- **Policies**: Authenticated users have full CRUD access ✓

## Database Schema

### Tables Connected:

1. **shift_workers** - Support worker profiles and assignments
2. **clients** - Client information with tasks column for medication/support instructions
3. **service_providers** - Service provider company profiles
4. **shifts** - Shift scheduling and assignments
5. **timesheets** - Timesheet records
6. **timesheet_entries** - Individual timesheet entries
7. **my_documents** - User document storage
8. **documents_blog** - Document sharing/blog
9. **reports** - Generated reports
10. **speech_to_text_logs** - Whisper API transcription logs
11. **map_search_history** - Google Maps search history
12. **notification_devices** - Expo push notification device tokens

## Custom API Endpoints

The following custom endpoints are available through your backend:

### Speech-to-Text (Whisper)
- **Endpoint**: `/api/speech-to-text`
- **Method**: POST
- **Body**: FormData with audio file
- **Returns**: `{ text: string }`
- **Usage**: Transcribe voice notes for any text field

### Google Maps Autocomplete
- **Endpoint**: `/api/maps/autocomplete`
- **Method**: GET
- **Query**: `?input=search_query`
- **Returns**: Array of place predictions

### Google Maps Geocoding
- **Endpoint**: `/api/maps/geocode`
- **Method**: GET
- **Query**: `?address=full_address`
- **Returns**: `{ lat: number, lng: number, formatted_address: string }`

### Push Notifications
- **Register Device**: `/api/push-notifications/register`
  - Method: POST
  - Body: `{ userId: string, token: string, platform: string }`
  
- **Send Notification**: `/api/push-notifications/send`
  - Method: POST
  - Body: `{ userId: string, title: string, body: string, data?: object }`

## Integration Features

### ✅ Direct Supabase Access
All screens now use Supabase REST API directly via `utils/supabase.ts`:
- `supabaseSelect()` - Query data
- `supabaseInsert()` - Create records
- `supabaseUpdate()` - Update records
- `supabaseDelete()` - Delete records
- `supabaseUploadFile()` - Upload files to storage

### ✅ Speech-to-Text Integration
The `SpeechToTextButton` component can be added to any text input:
```tsx
import { SpeechToTextButton } from '@/components/SpeechToTextButton';

<SpeechToTextButton
  onTranscription={(text) => setFieldValue(text)}
  style={styles.micButton}
/>
```

### ✅ Google Maps Integration
- Address autocomplete for client addresses
- Geocoding for location coordinates
- Static map previews

### ✅ Push Notifications
- Automatic device registration on login
- Send notifications for shift updates, approvals, etc.
- OneSignal integration for reliable delivery

## Usage Examples

### Query Clients with Tasks
```typescript
import { supabaseSelect } from '@/utils/supabase';

const clients = await supabaseSelect('clients', '*', {
  'service_provider_id': 'eq.123'
});

// Access the new tasks column
clients.forEach(client => {
  console.log('Medication tasks:', client.tasks);
});
```

### Insert Shift with Speech-to-Text Notes
```typescript
import { supabaseInsert } from '@/utils/supabase';
import { transcribeAudio } from '@/utils/speechToText';

// Record audio and transcribe
const audioFile = await recordAudio();
const transcription = await transcribeAudio(audioFile);

// Insert shift with transcribed notes
await supabaseInsert('shifts', {
  title: 'Morning Shift',
  notes: transcription.text,
  client_id: clientId,
  worker_id: workerId,
  start_time: new Date().toISOString(),
});
```

### Update Client Tasks
```typescript
import { supabaseUpdate } from '@/utils/supabase';

await supabaseUpdate(
  'clients',
  {
    tasks: 'Medication: Take 2 pills at 9am. Support: Assist with morning routine.'
  },
  { 'id': 'eq.client-uuid' }
);
```

### Upload Document
```typescript
import { supabaseUploadFile } from '@/utils/supabase';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  quality: 1,
});

if (!result.canceled) {
  const file = await fetch(result.assets[0].uri).then(r => r.blob());
  const { url } = await supabaseUploadFile(
    'documents',
    `${userId}/${Date.now()}.jpg`,
    file,
    'image/jpeg'
  );
  
  // Save document record
  await supabaseInsert('my_documents', {
    user_id: userId,
    file_url: url,
    file_name: 'Certificate.jpg',
    document_type: 'qualification',
  });
}
```

## Authentication

The app uses Better Auth for authentication, which is compatible with Supabase RLS:
- User tokens are automatically included in Supabase requests
- RLS policies check `auth.uid()` for row-level security
- All authenticated users have full CRUD access per your configuration

## Next Steps

1. ✅ Supabase configuration complete
2. ✅ All tables mapped and accessible
3. ✅ Custom API endpoints configured
4. ✅ Speech-to-text ready for any text field
5. ✅ Google Maps integration active
6. ✅ Push notifications configured

Your app is now fully integrated with Supabase! All screens will use the Supabase REST API directly for data operations, while custom endpoints handle speech-to-text, maps, and push notifications.
