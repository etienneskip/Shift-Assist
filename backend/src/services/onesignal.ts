import * as OneSignal from 'onesignal-node';

let client: OneSignal.Client | null = null;

export function initializeOneSignal(): OneSignal.Client | null {
  try {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_API_KEY;

    if (!appId || !apiKey) {
      console.warn('OneSignal credentials not configured. Push notifications will not be sent.');
      return null;
    }

    client = new OneSignal.Client(appId, apiKey);

    return client;
  } catch (error) {
    console.error('Error initializing OneSignal client:', error);
    return null;
  }
}

export function getOneSignalClient(): OneSignal.Client | null {
  if (!client) {
    return initializeOneSignal();
  }
  return client;
}

export interface PushNotificationPayload {
  userId?: string;
  playerIds?: string[];
  headings: { en: string };
  contents: { en: string };
  data?: Record<string, string>;
  big_picture?: string;
  ios_attachments?: { image1: string };
  android_big_picture?: string;
  large_icon?: string;
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  const onesignalClient = getOneSignalClient();

  if (!onesignalClient) {
    console.warn('OneSignal not configured, skipping push notification');
    return false;
  }

  try {
    if (payload.userId) {
      // Send to specific user by external ID
      await onesignalClient.createNotification({
        ...payload,
        include_external_user_ids: [payload.userId],
      } as any);
    } else if (payload.playerIds && payload.playerIds.length > 0) {
      // Send to specific devices
      await onesignalClient.createNotification({
        ...payload,
        include_player_ids: payload.playerIds,
      } as any);
    } else {
      console.error('No userId or playerIds provided for push notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification via OneSignal:', error);
    return false;
  }
}

export async function sendBulkPushNotifications(
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, string>,
): Promise<{ sent: number; failed: number }> {
  const onesignalClient = getOneSignalClient();

  if (!onesignalClient) {
    console.warn('OneSignal not configured, skipping bulk push notifications');
    return { sent: 0, failed: userIds.length };
  }

  let sent = 0;
  let failed = 0;

  try {
    // OneSignal supports bulk notifications via external user IDs
    await onesignalClient.createNotification({
      headings: { en: title },
      contents: { en: message },
      include_external_user_ids: userIds,
      data,
    } as any);

    sent = userIds.length;
  } catch (error) {
    console.error('Error sending bulk push notifications via OneSignal:', error);
    failed = userIds.length;
  }

  return { sent, failed };
}
