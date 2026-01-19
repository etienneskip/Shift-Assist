
# OneSignal Push Notifications Integration

This document explains how OneSignal push notifications are integrated into the Support Worker Shift app.

## Overview

The app uses OneSignal for push notifications on iOS, Android, and web platforms. Notifications are sent for:
- New shift assignments
- Shift updates and reminders
- Document expiry alerts
- Timesheet approvals
- Clock in/out events
- New messages and other important events

## Configuration

### 1. OneSignal Credentials

The following credentials are configured in `app.json`:

```json
{
  "extra": {
    "oneSignalAppId": "adc5b89a-b1e9-4b33-ab43-1ff2cd64601a"
  }
}
```

**Important:** The OneSignal REST API Key is stored securely on the backend and is NEVER exposed to the client.

### 2. Expo Plugin

The OneSignal Expo plugin is configured in `app.json`:

```json
{
  "plugins": [
    [
      "react-native-onesignal",
      {
        "mode": "development",
        "devTeam": "YOUR_APPLE_DEV_TEAM_ID"
      }
    ]
  ]
}
```

**Note:** Replace `YOUR_APPLE_DEV_TEAM_ID` with your actual Apple Developer Team ID for iOS builds.

## Architecture

### Frontend (React Native)

1. **Initialization** (`app/_layout.tsx`):
   - OneSignal is initialized when the app starts
   - Prompts user for notification permissions
   - Sets up notification event handlers

2. **Device Registration** (`contexts/AuthContext.tsx`):
   - When a user logs in, their device is registered with OneSignal
   - The OneSignal player ID is sent to the backend and stored in the database

3. **Notification Utilities** (`utils/pushNotifications.ts`):
   - `initializeOneSignal()` - Initialize the SDK
   - `registerDevice(userId)` - Register device and store player ID
   - `sendNotification(userId, title, message, data)` - Send notification to a user
   - `sendBulkNotification(userIds, title, message, data)` - Send to multiple users
   - `sendShiftNotification(shiftId, type)` - Send shift-specific notifications
   - `sendDocumentExpiryNotification(documentId, days)` - Send document expiry alerts

4. **Helper Functions** (`utils/notificationHelpers.ts`):
   - Pre-built functions for common notification scenarios
   - Examples: `notifyNewShift()`, `notifyShiftUpdate()`, `notifyClockIn()`, etc.

### Backend (Node.js/Express)

The backend handles all OneSignal API calls to keep the REST API key secure:

1. **Database Schema**:
   - `user` table has `onesignal_player_id` column to store device IDs

2. **API Endpoints**:
   - `POST /api/notifications/register-device` - Store player ID for a user
   - `POST /api/notifications/send` - Send notification to a specific user
   - `POST /api/notifications/send-bulk` - Send to multiple users
   - `POST /api/notifications/send-shift-notification` - Send shift notifications
   - `POST /api/notifications/send-document-expiry` - Send document expiry alerts

3. **Security**:
   - OneSignal REST API Key is stored in environment variables
   - All notification requests are authenticated
   - User IDs are validated before sending notifications

## Usage Examples

### 1. Send a New Shift Notification

```typescript
import { notifyNewShift } from '@/utils/notificationHelpers';

// When creating a new shift
const shiftId = 'shift-uuid';
const supportWorkerId = 'user-uuid';
const shiftTitle = 'Morning Care - John Doe';
const shiftDate = '2024-01-15';

await notifyNewShift(shiftId, supportWorkerId, shiftTitle, shiftDate);
```

### 2. Send a Shift Reminder

```typescript
import { notifyShiftReminder } from '@/utils/notificationHelpers';

// Send reminder 1 hour before shift starts
await notifyShiftReminder(shiftId, supportWorkerId, 1);
```

### 3. Send Document Expiry Alert

```typescript
import { notifyDocumentExpiry } from '@/utils/notificationHelpers';

// Alert when document expires in 7 days
await notifyDocumentExpiry(
  documentId,
  supportWorkerId,
  'First Aid Certificate',
  7
);
```

### 4. Send Custom Notification

```typescript
import { sendNotification } from '@/utils/pushNotifications';

await sendNotification(
  userId,
  'Custom Title',
  'Custom message content',
  {
    // Optional custom data
    type: 'custom',
    customField: 'value',
  }
);
```

### 5. Send Bulk Notification

```typescript
import { sendBulkNotification } from '@/utils/pushNotifications';

const workerIds = ['user-1', 'user-2', 'user-3'];

await sendBulkNotification(
  workerIds,
  'New Job Available',
  'Check the job board for new opportunities!',
  {
    type: 'job_posting',
  }
);
```

## Notification Event Handling

The app handles notification events in `utils/pushNotifications.ts`:

### Foreground Notifications

When a notification is received while the app is open:

```typescript
OneSignal.setNotificationWillShowInForegroundHandler((event) => {
  const notification = event.getNotification();
  const data = notification.additionalData;
  
  // Display the notification
  event.complete(notification);
});
```

### Notification Opened

When a user taps on a notification:

```typescript
OneSignal.setNotificationOpenedHandler((openedEvent) => {
  const { notification } = openedEvent;
  const data = notification.additionalData;
  
  // Navigate based on notification data
  // Example: if (data?.shiftId) router.push(`/shift/${data.shiftId}`)
});
```

## Testing

### Development Testing

1. **Test Device Registration**:
   - Log in to the app
   - Check console logs for: `[OneSignal] Device registered successfully`
   - Verify player ID is stored in the database

2. **Test Sending Notifications**:
   - Use the notification helper functions
   - Check console logs for success/error messages
   - Verify notifications appear on the device

3. **Test Notification Opening**:
   - Tap on a notification
   - Verify the app opens and navigates correctly

### Production Testing

1. Build the app for production:
   ```bash
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

2. Install the production build on a test device

3. Test all notification scenarios:
   - New shifts
   - Shift updates
   - Document expiry
   - Clock in/out
   - Custom notifications

## Troubleshooting

### Notifications Not Received

1. **Check Permissions**:
   - Ensure notification permissions are granted
   - Use `getNotificationPermissionStatus()` to check

2. **Check Player ID**:
   - Verify player ID is stored in the database
   - Check console logs for registration errors

3. **Check Backend Logs**:
   - Verify OneSignal API calls are successful
   - Check for 400/500 errors

### Notifications Not Opening App

1. **Check Deep Linking**:
   - Verify `scheme` is configured in `app.json`
   - Test deep link URLs

2. **Check Notification Data**:
   - Ensure `additionalData` contains necessary info
   - Verify navigation logic in `setNotificationOpenedHandler`

### iOS Specific Issues

1. **Provisioning Profile**:
   - Ensure push notification capability is enabled
   - Update provisioning profile if needed

2. **APNs Certificate**:
   - Verify APNs certificate is uploaded to OneSignal dashboard
   - Check certificate expiry date

### Android Specific Issues

1. **Firebase Configuration**:
   - Verify Firebase project is linked to OneSignal
   - Check `google-services.json` is present

2. **Notification Channels**:
   - Ensure notification channels are properly configured
   - Test on Android 8.0+ devices

## Best Practices

1. **Always Check Permissions**:
   ```typescript
   const status = await getNotificationPermissionStatus();
   if (status !== 'granted') {
     await requestNotificationPermissions();
   }
   ```

2. **Handle Errors Gracefully**:
   ```typescript
   try {
     await sendNotification(userId, title, message);
   } catch (error) {
     console.error('Failed to send notification:', error);
     // Show user-friendly error message
   }
   ```

3. **Include Relevant Data**:
   ```typescript
   await sendNotification(userId, title, message, {
     type: 'shift_update',
     shiftId: 'uuid',
     // Include data needed for navigation
   });
   ```

4. **Test on All Platforms**:
   - iOS (physical device required for push notifications)
   - Android (emulator and physical device)
   - Web (browser notifications)

5. **Monitor Notification Logs**:
   - Check backend logs for delivery status
   - Monitor OneSignal dashboard for analytics

## Security Considerations

1. **API Key Protection**:
   - OneSignal REST API Key is NEVER exposed to the client
   - All notification sending happens on the backend

2. **User Validation**:
   - Backend validates user IDs before sending notifications
   - Prevents unauthorized notification sending

3. **Data Privacy**:
   - Only necessary data is included in notifications
   - Sensitive information is not sent in notification content

4. **Authentication**:
   - All backend endpoints require authentication
   - Player IDs are associated with authenticated users only

## Additional Resources

- [OneSignal Documentation](https://documentation.onesignal.com/)
- [React Native OneSignal SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [Expo OneSignal Plugin](https://github.com/OneSignal/onesignal-expo-plugin)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
