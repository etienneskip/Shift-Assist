
# API Integration Quick Reference

## Making API Calls

### Import the helpers
```typescript
import { 
  authenticatedGet, 
  authenticatedPost, 
  authenticatedPatch, 
  authenticatedDelete,
  BACKEND_URL 
} from '@/utils/api';
```

### GET Request
```typescript
const data = await authenticatedGet<ResponseType>('/api/endpoint');
```

### POST Request
```typescript
const data = await authenticatedPost<ResponseType>('/api/endpoint', {
  field1: 'value1',
  field2: 'value2',
});
```

### PATCH Request
```typescript
const data = await authenticatedPatch<ResponseType>('/api/endpoint', {
  field1: 'newValue',
});
```

### DELETE Request
```typescript
await authenticatedDelete('/api/endpoint');
```

## Error Handling Pattern

```typescript
const [loading, setLoading] = useState(true);

const loadData = async () => {
  try {
    setLoading(true);
    console.log('[Component] Loading data...');
    
    const response = await authenticatedGet<DataType>('/api/endpoint');
    console.log('[Component] Data loaded:', response);
    
    setData(response);
  } catch (error) {
    console.error('[Component] Error loading data:', error);
    Alert.alert('Error', 'Failed to load data. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

## File Upload Pattern

```typescript
const handleUpload = async (fileUri: string) => {
  try {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'file';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: fileUri,
      name: filename,
      type,
    } as any);

    const token = await getBearerToken();
    const response = await fetch(`${BACKEND_URL}/api/upload-endpoint`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Upload] Success:', result);
  } catch (error) {
    console.error('[Upload] Error:', error);
    Alert.alert('Error', 'Upload failed');
  }
};
```

## Common Endpoints

### Authentication
- `POST /api/auth/sign-in` - Sign in (handled by Better Auth)
- `POST /api/auth/sign-up` - Sign up (handled by Better Auth)
- `POST /api/auth/sign-out` - Sign out (handled by Better Auth)

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users` - Get all users (admin)
- `POST /api/users/{userId}/roles` - Assign role

### Shifts
- `GET /api/shifts` - Get all shifts (with filters)
- `GET /api/shifts/{id}` - Get shift by ID
- `POST /api/shifts` - Create shift
- `PATCH /api/shifts/{id}` - Update shift
- `DELETE /api/shifts/{id}` - Delete shift

### Timesheets
- `GET /api/timesheets` - Get timesheets (with filters)
- `GET /api/timesheets/{id}` - Get timesheet by ID
- `POST /api/timesheets` - Create timesheet (clock in)
- `PATCH /api/timesheets/{id}` - Update timesheet (clock out)
- `POST /api/timesheets/{id}/submit` - Submit for approval
- `POST /api/timesheets/{id}/approve` - Approve timesheet
- `POST /api/timesheets/{id}/reject` - Reject timesheet

### Documents
- `GET /api/compliance-documents/my` - Get my documents
- `POST /api/compliance-documents/upload` - Upload document
- `DELETE /api/compliance-documents/{id}` - Delete document
- `GET /api/compliance-documents/{id}/url` - Get signed URL

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create client (auto-geocodes)
- `PUT /api/clients/{id}` - Update client
- `DELETE /api/clients/{id}` - Delete client

### Service Providers
- `GET /api/service-providers/profile` - Get profile
- `PATCH /api/service-providers/profile` - Update profile
- `GET /api/service-providers/workers` - Get all workers
- `GET /api/service-providers/workers/{id}/shifts` - Get worker shifts
- `GET /api/service-providers/workers/{id}/timesheets` - Get worker timesheets

### Notifications
- `GET /api/notifications` - Get all notifications
- `PATCH /api/notifications/{id}/read` - Mark as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read

### Push Notifications
- `POST /api/push-notifications/register` - Register device
- `POST /api/push-notifications/send` - Send notification
- `POST /api/push-notifications/send-bulk` - Send bulk
- `POST /api/push-notifications/send-shift` - Send shift notification

### Reports
- `GET /api/reports/service-provider-shifts` - Generate PDF report

## TypeScript Interfaces

### User
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}
```

### Shift
```typescript
interface Shift {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  location: string;
}
```

### Timesheet
```typescript
interface Timesheet {
  id: string;
  shiftId: string;
  supportWorkerId: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string;
  status: string;
}
```

### Document
```typescript
interface Document {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  url: string;
  expiryDate?: string;
  status: string;
}
```

## Best Practices

1. **Always use authenticated helpers** for protected endpoints
2. **Log all API calls** for debugging: `console.log('[Component] Action:', data)`
3. **Handle errors gracefully** with try-catch and user-friendly alerts
4. **Show loading states** during API calls
5. **Transform API responses** to match frontend interfaces
6. **Never hardcode URLs** - always use `BACKEND_URL` from utils/api
7. **Add TypeScript types** for all API responses
8. **Test error cases** (network errors, 401, 404, etc.)

## Debugging Tips

1. Check console logs - all API calls are logged
2. Verify `BACKEND_URL` in app.json
3. Check authentication token: `await getBearerToken()`
4. Test endpoints in Postman/Insomnia first
5. Check network tab in browser dev tools (web)
6. Use React Native Debugger for native debugging

## Common Issues

### 401 Unauthorized
- Token expired or invalid
- User not logged in
- Check `await getBearerToken()`

### 404 Not Found
- Endpoint doesn't exist
- Check API documentation
- Verify endpoint path

### 500 Server Error
- Backend error
- Check backend logs
- Verify request payload

### Network Error
- Backend not running
- Wrong URL in app.json
- CORS issues (web only)

## Environment Variables

Backend URL is configured in `app.json`:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://your-backend-url.com"
    }
  }
}
```

Access it via:
```typescript
import Constants from 'expo-constants';
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
```
