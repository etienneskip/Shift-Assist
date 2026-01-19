
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  useIcon?: boolean;
  customImage?: any;
}

export default function SelectRoleScreen() {
  const quickActions: QuickAction[] = [
    {
      id: 'service-providers',
      icon: 'business',
      label: 'Service Provider',
      description: 'Manage clients, shifts, and team',
      route: '/create-service-provider-account',
      color: colors.primary,
    },
    {
      id: 'support-workers',
      icon: 'group',
      label: 'Support Worker',
      description: 'Manage your shifts, timesheets, and documents',
      route: '/create-support-worker-account',
      color: colors.primary,
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Select Your Role',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/d535c926-ab15-4bf8-bf1c-71bd6c9d0f49.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeMessage}>
            Welcome! Please select your role to continue
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={`${action.id}-${index}`}
                style={[styles.quickActionCard, { borderColor: action.color }]}
                onPress={() => {
                  console.log(`User tapped ${action.label} quick action`);
                  router.push(action.route as any);
                }}
              >
                <View
                  style={[styles.iconContainer, { backgroundColor: action.color }]}
                >
                  <IconSymbol
                    ios_icon_name={action.icon}
                    android_material_icon_name={action.icon}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
                <Text style={styles.quickActionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logo: {
    width: 240,
    height: 120,
    marginBottom: 16,
  },
  welcomeMessage: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    padding: 20,
  },
  quickActionsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  quickActionCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
