
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  initializePushNotifications,
  registerDevice,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  isPushNotificationSupported,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getExpoPushToken,
} from '@/utils/pushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Initialize push notifications
  useEffect(() => {
    const init = async () => {
      await initializePushNotifications();
      setIsSupported(isPushNotificationSupported());
      
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        const token = await getExpoPushToken();
        setExpoPushToken(token);
      }
    };
    
    init();
  }, []);

  // Register device when user logs in
  useEffect(() => {
    if (user?.id && permissionStatus === 'granted') {
      registerDevice(user.id);
    }
  }, [user?.id, permissionStatus]);

  // Set up notification listeners
  useEffect(() => {
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    const responseSubscription = addNotificationResponseListener((response) => {
      console.log('[usePushNotifications] Notification response:', response);
      // You can handle navigation here based on notification data
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Request permissions
  const requestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    
    if (granted) {
      const token = await getExpoPushToken();
      setExpoPushToken(token);
      
      if (user?.id && token) {
        await registerDevice(user.id);
      }
    }
    
    return granted;
  };

  return {
    expoPushToken,
    permissionStatus,
    notification,
    isSupported,
    requestPermissions,
  };
}
