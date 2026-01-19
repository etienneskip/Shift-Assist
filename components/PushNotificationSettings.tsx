
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';

export function PushNotificationSettings() {
  const { permissionStatus, isSupported, expoPushToken, requestPermissions } = usePushNotifications();

  const handleRequestPermissions = async () => {
    if (permissionStatus === 'denied') {
      Alert.alert(
        'Notifications Disabled',
        'Push notifications are disabled. Please enable them in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                // On iOS, you can't directly open settings, but you can guide the user
                Alert.alert(
                  'Enable Notifications',
                  'Go to Settings > Notifications > Shift Assist and enable notifications.'
                );
              }
            }
          },
        ]
      );
      return;
    }

    const granted = await requestPermissions();
    if (granted) {
      Alert.alert('Success', 'Push notifications enabled!');
    } else {
      Alert.alert('Error', 'Failed to enable push notifications.');
    }
  };

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <IconSymbol 
            ios_icon_name="bell.slash.fill" 
            android_material_icon_name="notifications-off" 
            size={24} 
            color={colors.textSecondary} 
          />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Push Notifications</Text>
            <Text style={styles.subtitle}>Not supported on this device</Text>
          </View>
        </View>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Disabled';
      default:
        return 'Not Set';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <IconSymbol 
          ios_icon_name="bell.fill" 
          android_material_icon_name="notifications" 
          size={24} 
          color={getStatusColor()} 
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Push Notifications</Text>
          <Text style={[styles.subtitle, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        {permissionStatus !== 'granted' && (
          <TouchableOpacity 
            style={styles.button}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.buttonText}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {expoPushToken && __DEV__ && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Push Token (Dev Only):</Text>
          <Text style={styles.tokenText} numberOfLines={1} ellipsizeMode="middle">
            {expoPushToken}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tokenLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 11,
    color: colors.text,
    fontFamily: 'monospace',
  },
});
