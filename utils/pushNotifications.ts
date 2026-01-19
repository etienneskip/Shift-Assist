
/**
 * Push Notifications Utility - Expo Push Notifications
 * 
 * Full implementation of Expo Push Notifications for the app.
 * Handles device registration, permission requests, and notification handling.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authenticatedPost, getBearerToken } from './api';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || '';

console.log('[PushNotifications] Initializing Expo Push Notifications');
console.log('[PushNotifications] Backend URL:', BACKEND_URL);

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Initialize push notifications
 * Sets up notification channels for Android and configures handlers
 */
export const initializePushNotifications = async () => {
  console.log('[PushNotifications] Initializing...');
  
  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('shifts', {
      name: 'Shifts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('documents', {
      name: 'Documents',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#2196F3',
      sound: 'default',
    });
  }
  
  console.log('[PushNotifications] Initialization complete');
};

/**
 * Check if push notifications are supported on this device
 */
export const isPushNotificationSupported = (): boolean => {
  return Device.isDevice;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermissionStatus = async (): Promise<'granted' | 'denied' | 'undetermined'> => {
  const { status } = await Notifications.getPermissionsAsync();
  
  if (status === 'granted') {
    return 'granted';
  } else if (status === 'denied') {
    return 'denied';
  } else {
    return 'undetermined';
  }
};

/**
 * Request notification permissions from the user
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  console.log('[PushNotifications] Requesting permissions...');
  
  if (!isPushNotificationSupported()) {
    console.log('[PushNotifications] Push notifications not supported on this device');
    return false;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('[PushNotifications] Permission denied');
    return false;
  }
  
  console.log('[PushNotifications] Permission granted');
  return true;
};

/**
 * Get the Expo push token for this device
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  console.log('[PushNotifications] Getting Expo push token...');
  
  if (!isPushNotificationSupported()) {
    console.log('[PushNotifications] Not a physical device, cannot get push token');
    return null;
  }
  
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.easConfig?.projectId;
    
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    console.log('[PushNotifications] Got push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('[PushNotifications] Error getting push token:', error);
    return null;
  }
};

/**
 * Register device with the backend
 * Gets the Expo push token and sends it to the backend for storage
 */
export const registerDevice = async (userId: string): Promise<boolean> => {
  console.log('[PushNotifications] Registering device for user:', userId);
  
  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[PushNotifications] No permission, cannot register device');
      return false;
    }
    
    // Get the push token
    const token = await getExpoPushToken();
    if (!token) {
      console.log('[PushNotifications] No push token, cannot register device');
      return false;
    }
    
    // Register with backend
    const response = await authenticatedPost('/api/push-notifications/register', {
      token,
      platform: Platform.OS,
    });
    
    if (response.success) {
      console.log('[PushNotifications] Device registered successfully');
      return true;
    } else {
      console.error('[PushNotifications] Failed to register device:', response);
      return false;
    }
  } catch (error) {
    console.error('[PushNotifications] Error registering device:', error);
    return false;
  }
};

/**
 * Send a push notification to a specific user
 * This calls the backend API which handles the actual sending
 */
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'shift' | 'document' | 'timesheet' | 'general' = 'general',
  data?: Record<string, any>
): Promise<boolean> => {
  console.log('[PushNotifications] Sending notification to user:', userId);
  
  try {
    const response = await authenticatedPost('/api/push-notifications/send', {
      userId,
      title,
      message,
      data,
    });
    
    if (response.success) {
      console.log('[PushNotifications] Notification sent successfully');
      return true;
    } else {
      console.error('[PushNotifications] Failed to send notification:', response);
      return false;
    }
  } catch (error) {
    console.error('[PushNotifications] Error sending notification:', error);
    return false;
  }
};

/**
 * Send a push notification to multiple users
 */
export const sendBulkNotification = async (
  userIds: string[],
  title: string,
  message: string,
  type: 'shift' | 'document' | 'timesheet' | 'general' = 'general',
  data?: Record<string, any>
): Promise<boolean> => {
  console.log('[PushNotifications] Sending bulk notification to', userIds.length, 'users');
  
  try {
    const response = await authenticatedPost('/api/push-notifications/send-bulk', {
      userIds,
      title,
      message,
      data,
    });
    
    if (response.success) {
      console.log('[PushNotifications] Bulk notification sent successfully');
      return true;
    } else {
      console.error('[PushNotifications] Failed to send bulk notification:', response);
      return false;
    }
  } catch (error) {
    console.error('[PushNotifications] Error sending bulk notification:', error);
    return false;
  }
};

/**
 * Send a shift notification
 */
export const sendShiftNotification = async (
  userId: string,
  shiftId: string,
  notificationType: 'new' | 'update' | 'reminder',
  shiftTitle: string,
  shiftTime: string
): Promise<boolean> => {
  console.log('[PushNotifications] Sending shift notification:', notificationType);
  
  try {
    const response = await authenticatedPost('/api/push-notifications/send-shift', {
      userId,
      shiftId,
      notificationType,
      shiftTitle,
      startTime: shiftTime,
    });
    
    if (response.success) {
      console.log('[PushNotifications] Shift notification sent successfully');
      return true;
    } else {
      console.error('[PushNotifications] Failed to send shift notification:', response);
      return false;
    }
  } catch (error) {
    console.error('[PushNotifications] Error sending shift notification:', error);
    return false;
  }
};

/**
 * Send a document expiry notification
 */
export const sendDocumentExpiryNotification = async (
  userId: string,
  documentName: string,
  daysUntilExpiry: number
): Promise<boolean> => {
  console.log('[PushNotifications] Sending document expiry notification');
  
  try {
    const response = await authenticatedPost('/api/push-notifications/send-document-expiry', {
      userId,
      documentName,
      daysRemaining: daysUntilExpiry,
    });
    
    if (response.success) {
      console.log('[PushNotifications] Document expiry notification sent successfully');
      return true;
    } else {
      console.error('[PushNotifications] Failed to send document expiry notification:', response);
      return false;
    }
  } catch (error) {
    console.error('[PushNotifications] Error sending document expiry notification:', error);
    return false;
  }
};

/**
 * Add notification received listener
 * Called when a notification is received while app is in foreground
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener
 * Called when user taps on a notification
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Schedule a local notification
 * Useful for reminders and offline notifications
 */
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, any>
) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });
    
    console.log('[PushNotifications] Local notification scheduled:', id);
    return id;
  } catch (error) {
    console.error('[PushNotifications] Error scheduling local notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled local notification
 */
export const cancelLocalNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[PushNotifications] Local notification cancelled:', notificationId);
  } catch (error) {
    console.error('[PushNotifications] Error cancelling local notification:', error);
  }
};

/**
 * Cancel all scheduled local notifications
 */
export const cancelAllLocalNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[PushNotifications] All local notifications cancelled');
  } catch (error) {
    console.error('[PushNotifications] Error cancelling all local notifications:', error);
  }
};

/**
 * Get badge count (iOS only)
 */
export const getBadgeCount = async (): Promise<number> => {
  if (Platform.OS === 'ios') {
    return await Notifications.getBadgeCountAsync();
  }
  return 0;
};

/**
 * Set badge count (iOS only)
 */
export const setBadgeCount = async (count: number) => {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(count);
  }
};

/**
 * Clear badge count (iOS only)
 */
export const clearBadgeCount = async () => {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }
};
