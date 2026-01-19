
# Expo Push Notifications Implementation Guide

## Overview

This app now uses **Expo Push Notifications** instead of OneSignal. This implementation provides full push notification functionality for both development and production builds, and is fully compatible with Expo Go and the managed workflow.

## Features Implemented

### ✅ Frontend (React Native + Expo)

1. **Push Notification Registration**
   - Automatic device registration when user logs in
   - Permission request handling for iOS and Android
   - Expo push token generation and storage

2. **Notification Handling**
   - Foreground notifications (app is open)
   - Background notifications (app is in background)
   - Notification tap handling with deep linking
   - Badge count management (iOS)

3. **User Interface**
   - Push notification settings component in profile screen
   - Permission status display
   - Enable/disable notifications button
   - Dev mode: Display push token for testing

4. **Notification Channels (Android)**
   - Default channel for general notifications
   - Shifts channel for shift-related notifications
   - Documents channel for document notifications

### ✅ Backend (Node.js + Expo Server SDK)

1. **Push Token Management**
   - Store push tokens in database (push_notification_tokens table)
   - Support multiple devices per user
   - Automatic token validation
   - Invalid token cleanup

2. **Notification Sending**
   - Send to single user
   - Send to multiple users (bulk)
   - Shift-specific notifications
   - Document expiry notifications
   - Notification attempt logging

3. **Error Handling**
   - Invalid token detection
   - DeviceNotRegistered error handling
   - Retry logic for failed notifications
   - Detailed error logging

## Database Schema

### push_notification_tokens
```sql
- id: uuid (primary key)
- user_id: text (foreign key to user table)
- token: text (Expo push token)
- platform: text ('ios' | 'android' | 'web')
- is_valid: boolean (token validity status)
- last_used_at: timestamp (last successful notification)
- created_at: timestamp
- updated_at: timestamp
```

### push_notification_attempts
```sql
- id: uuid (primary key)
- user_id: text (foreign key to user table)
- token: text (Expo push token used)
- title: text (notification title)
- message: text (notification body)
- notification_type: text ('shift' | 'document' | 'timesheet' | 'general')
- status: text ('success' | 'failed' | 'invalid_token')
- error_message: text (error details if failed)
- expo_message_id: text (Expo's message ID)
- data: text (JSON string of additional data)
- created_at: timestamp
- updated_at: timestamp
```

## API Endpoints

### POST /api/push-notifications/register
Register a device for push notifications.

**Request:**
```json
{
  "userId": "user-id",
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios"
}
```

**Response:**
```json
{
  "success": true,
  "tokenId": "token-uuid"
}
```

### POST /api/push-notifications/send
Send a push notification to a specific user.

**Request:**
```json
{
  "userId": "user-id",
  "title": "New Shift Assigned",
  "message": "You have been assigned to a shift on Jan 15",
  "type": "shift",
  "data": {
    "shiftId": "shift-uuid",
    "shiftDate": "2024-01-15"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "expo-message-id"
}
```

### POST /api/push-notifications/send-bulk
Send notifications to multiple users.

**Request:**
```json
{
  "userIds": ["user-id-1", "user-id-2"],
  "title": "New Job Available",
  "message": "A new job has been posted",
  "type": "shift",
  "data": {
    "jobId": "job-uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sentCount": 2,
  "failedCount": 0
}
```

### POST /api/push-notifications/send-shift
Send a shift-specific notification.

**Request:**
```json
{
  "userId": "user-id",
  "shiftId": "shift-uuid",
  "notificationType": "new",
  "shiftTitle": "Morning Shift - Client A",
  "shiftTime": "Jan 15, 2024 at 9:00 AM"
}
```

### POST /api/push-notifications/send-document-expiry
Send a document expiry notification.

**Request:**
```json
{
  "userId": "user-id",
  "documentName": "First Aid Certificate",
  "daysUntilExpiry": 7
}
```

### GET /api/push-notifications/tokens/:userId
Get all push tokens for a user.

**Response:**
```json
[
  {
    "id": "token-uuid",
    "token": "ExponentPushToken[xxx]",
    "platform": "ios",
    "isValid": true,
    "lastUsedAt": "2024-01-13T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### DELETE /api/push-notifications/tokens/:tokenId
Remove a push token (for logout/unregister).

## Usage Examples

### Frontend: Register Device
```typescript
import { registerDevice } from '@/utils/pushNotifications';

// Register device when user logs in
await registerDevice(userId);
```

### Frontend: Send Notification (via backend)
```typescript
import { sendNotification } from '@/utils/pushNotifications';

// Send a notification
await sendNotification(
  userId,
  'Shift Reminder',
  'Your shift starts in 1 hour',
  'shift',
  { shiftId: 'shift-uuid' }
);
```

### Frontend: Use Hook
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { 
    expoPushToken, 
    permissionStatus, 
    isSupported, 
    requestPermissions 
  } = usePushNotifications();

  return (
    <View>
      <Text>Status: {permissionStatus}</Text>
      {permissionStatus !== 'granted' && (
        <Button onPress={requestPermissions}>
          Enable Notifications
        </Button>
      )}
    </View>
  );
}
```

### Frontend: Schedule Local Notification
```typescript
import { scheduleLocalNotification } from '@/utils/pushNotifications';

// Schedule a reminder 1 hour before shift
await scheduleLocalNotification(
  'Shift Reminder',
  'Your shift starts in 1 hour',
  {
    seconds: 3600, // 1 hour from now
  },
  { shiftId: 'shift-uuid' }
);
```

### Frontend: Handle Notification Tap
```typescript
import { addNotificationResponseListener } from '@/utils/pushNotifications';

// Listen for notification taps
const subscription = addNotificationResponseListener((response) => {
  const data = response.notification.request.content.data;
  
  // Navigate based on notification data
  if (data.shiftId) {
    router.push(`/shift/${data.shiftId}`);
  }
});

// Clean up
subscription.remove();
```

## Notification Triggers

The following events automatically trigger push notifications:

1. **New Shift Created** → `notifyNewShift()`
2. **Shift Updated** → `notifyShiftUpdate()`
3. **Shift Reminder** → `notifyShiftReminder()` (1 hour before)
4. **Document Expiring** → `notifyDocumentExpiry()` (7 days before)
5. **Timesheet Approved** → `notifyTimesheetApproved()`
6. **Shift Note Added** → `notifyShiftNoteAdded()`
7. **Worker Clocked In** → `notifyClockIn()`
8. **Worker Clocked Out** → `notifyClockOut()`
9. **New Job Posted** → `notifyNewJobPosting()`
10. **Document Uploaded** → `notifyDocumentUploaded()`
11. **Shift Cancelled** → `notifyShiftCancelled()`
12. **Shift Assignment** → `notifyShiftAssignment()`

## Testing Push Notifications

### Development Mode (Expo Go)

1. **Install Expo Go** on your physical device (iOS or Android)
2. **Run the app**: `npm run dev`
3. **Scan QR code** with Expo Go
4. **Login** to the app
5. **Grant notification permissions** when prompted
6. **Check profile screen** to see your push token (dev mode only)

### Testing with Expo Push Notification Tool

1. Go to: https://expo.dev/notifications
2. Enter your Expo push token (from profile screen in dev mode)
3. Enter title and message
4. Click "Send a Notification"
5. You should receive the notification on your device

### Testing Backend Integration

```bash
# Send a test notification via backend API
curl -X POST https://your-backend-url/api/push-notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "userId": "user-id",
    "title": "Test Notification",
    "message": "This is a test",
    "type": "general"
  }'
```

## Production Builds

### iOS (App Store)

1. **Configure app.json**:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourcompany.yourapp"
       }
     }
   }
   ```

2. **Build with EAS**:
   ```bash
   eas build --platform ios
   ```

3. **Push notifications work automatically** (no additional setup needed)

### Android (Google Play)

1. **Configure app.json**:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.yourcompany.yourapp"
       }
     }
   }
   ```

2. **Build with EAS**:
   ```bash
   eas build --platform android
   ```

3. **Push notifications work automatically** (no FCM setup needed)

## Troubleshooting

### "Push notifications not supported on this device"
- **Cause**: Running on iOS Simulator or Android Emulator
- **Solution**: Use a physical device

### "Permission denied"
- **Cause**: User denied notification permissions
- **Solution**: Guide user to device settings to enable notifications

### "Invalid Expo push token"
- **Cause**: Token format is incorrect or expired
- **Solution**: Re-register device to get a new token

### Notifications not received
1. Check permission status in profile screen
2. Verify push token is registered in backend
3. Check backend logs for notification sending errors
4. Ensure app is not in "Do Not Disturb" mode
5. Check notification settings in device settings

### Backend errors
1. Check backend logs: `get_backend_logs`
2. Verify push token is valid (starts with `ExponentPushToken[`)
3. Check database for push_notification_attempts table
4. Ensure expo-server-sdk is installed on backend

## Migration from OneSignal

### Removed
- ❌ OneSignal SDK and dependencies
- ❌ OneSignal plugin from app.json
- ❌ onesignal_player_id column from user table
- ❌ OneSignal REST API integration

### Added
- ✅ expo-notifications package
- ✅ expo-device package
- ✅ Expo Push Notifications plugin in app.json
- ✅ push_notification_tokens table
- ✅ push_notification_attempts table
- ✅ Expo Server SDK on backend

### Benefits of Expo Push Notifications
- ✅ Works with Expo Go (no need for development builds)
- ✅ Works with managed workflow
- ✅ No external service dependencies
- ✅ Free for unlimited notifications
- ✅ Simpler setup and configuration
- ✅ Better integration with Expo ecosystem
- ✅ Automatic token management
- ✅ Built-in error handling

## Additional Resources

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Push Notification Tool](https://expo.dev/notifications)
- [Expo Push Notification Format](https://docs.expo.dev/push-notifications/sending-notifications/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs with `get_backend_logs`
3. Check Expo documentation
4. Verify push token format and validity
