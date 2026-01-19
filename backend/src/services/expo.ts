import { Expo, type ExpoPushMessage, type ExpoPushSuccessTicket } from 'expo-server-sdk';

let client: Expo | null = null;

export function initializeExpo(): Expo | null {
  try {
    // Expo SDK initializes automatically, no credentials needed
    client = new Expo();
    console.log('Expo push notification client initialized');
    return client;
  } catch (error) {
    console.error('Error initializing Expo client:', error);
    return null;
  }
}

export function getExpoClient(): Expo | null {
  if (!client) {
    return initializeExpo();
  }
  return client;
}

export interface PushNotificationPayload {
  tokens: string[];
  title: string;
  message: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  priority?: 'default' | 'high';
}

export interface SendPushNotificationsResult {
  sent: number;
  failed: number;
  tickets: string[];
  invalidTokens?: string[];
}

/**
 * Send push notification to one or more devices
 */
export async function sendPushNotifications(
  payload: PushNotificationPayload,
): Promise<SendPushNotificationsResult> {
  const expoClient = getExpoClient();

  if (!expoClient) {
    console.warn('Expo client not available, skipping push notification');
    return { sent: 0, failed: payload.tokens.length, tickets: [], invalidTokens: [] };
  }

  let sent = 0;
  let failed = 0;
  const tickets: string[] = [];
  const invalidTokens: string[] = [];

  try {
    // Prepare messages for Expo SDK
    const messages: ExpoPushMessage[] = payload.tokens.map((token) => {
      const message: ExpoPushMessage = {
        to: token,
        sound: payload.sound || 'default',
        title: payload.title,
        body: payload.message,
        data: payload.data || {},
      };

      // Add priority for high-priority notifications
      if (payload.priority === 'high') {
        message.priority = 'high';
      }

      return message;
    });

    // Send notifications in chunks (Expo recommends max 100 per request)
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expoClient.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const token = chunk[i].to as string;

          if (ticket.status === 'ok') {
            sent++;
            const successTicket = ticket as ExpoPushSuccessTicket;
            tickets.push(successTicket.id);
          } else {
            failed++;
            // Track invalid tokens
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.message?.includes('not registered')
            ) {
              invalidTokens.push(token);
            }
          }
        }
      } catch (error) {
        console.error('Error sending chunk of notifications:', error);
        failed += chunk.length;
      }
    }

    return { sent, failed, tickets, invalidTokens };
  } catch (error) {
    console.error('Error sending push notifications via Expo:', error);
    return { sent: 0, failed: payload.tokens.length, tickets: [], invalidTokens: [] };
  }
}

/**
 * Check push notification receipt status
 * Call this after a delay to verify delivery
 */
export async function checkPushNotificationReceipts(
  ticketIds: string[],
): Promise<Record<string, unknown>> {
  const expoClient = getExpoClient();

  if (!expoClient || ticketIds.length === 0) {
    return {};
  }

  try {
    const receipts = await expoClient.getPushNotificationReceiptsAsync(ticketIds);
    return receipts;
  } catch (error) {
    console.error('Error checking push notification receipts:', error);
    return {};
  }
}

/**
 * Validate that a token is in a valid format for Expo
 */
export function isValidExpoToken(token: string): boolean {
  return Expo.isExpoPushToken(token);
}
