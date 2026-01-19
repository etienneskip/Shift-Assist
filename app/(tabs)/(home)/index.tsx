
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseSelect } from '@/utils/supabase';
import { SupabaseStatus } from '@/components/SupabaseStatus';

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

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      checkUserRoles();
    }
  }, [authLoading, user]);

  const checkUserRoles = async () => {
    console.log('[Home] Checking user roles for:', user?.id);
    
    if (!user) {
      console.log('[Home] No user found, showing role selection');
      setChecking(false);
      return;
    }

    try {
      // Check if user is a service provider
      const serviceProviders = await supabaseSelect<any>(
        'service_providers',
        '*',
        { 'user_id': `eq.${user.id}` }
      );

      if (serviceProviders.length > 0) {
        console.log('[Home] User is a service provider, redirecting to dashboard');
        router.replace('/service-provider-settings');
        return;
      }

      // Check if user is a support worker
      const supportWorkers = await supabaseSelect<any>(
        'support_workers',
        '*',
        { 'user_id': `eq.${user.id}` }
      );

      if (supportWorkers.length > 0) {
        console.log('[Home] User is a support worker, redirecting to calendar');
        router.replace('/(tabs)/calendar');
        return;
      }

      // User is logged in but has no role - show role selection
      console.log('[Home] User logged in but no roles found, showing role selection');
      setChecking(false);
    } catch (error) {
      console.error('[Home] Error checking user roles:', error);
      setChecking(false);
    }
  };

  const handleRoleSelection = (role: 'service-provider' | 'support-worker') => {
    console.log(`[Home] User selected ${role} role`);
    
    if (!user) {
      // User not logged in - redirect to auth screen with role parameter
      console.log('[Home] User not logged in, redirecting to auth screen');
      router.push(`/auth?role=${role}`);
    } else {
      // User is logged in - redirect to account creation
      console.log('[Home] User logged in, redirecting to account creation');
      if (role === 'service-provider') {
        router.push('/create-service-provider-account');
      } else {
        router.push('/create-support-worker-account');
      }
    }
  };

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
      useIcon: false,
      customImage: require('@/assets/images/6e4d6896-73aa-41c8-969e-e11916abf560.png'),
    },
  ];

  if (authLoading || checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
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
            {user ? 'Select your role to continue' : 'Welcome! Please select your role to get started'}
          </Text>
          
          {/* Show login status */}
          {!user && (
            <Text style={styles.loginHint}>
              You'll be asked to sign in or create an account
            </Text>
          )}
          
          {/* Supabase Connection Status */}
          <View style={styles.statusContainer}>
            <SupabaseStatus />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={`${action.id}-${index}`}
                style={[styles.quickActionCard, { borderColor: action.color }]}
                onPress={() => {
                  if (action.id === 'service-providers') {
                    handleRoleSelection('service-provider');
                  } else if (action.id === 'support-workers') {
                    handleRoleSelection('support-worker');
                  }
                }}
              >
                {action.useIcon === false && action.customImage ? (
                  <Image
                    source={action.customImage}
                    style={styles.customIcon}
                    resizeMode="contain"
                  />
                ) : (
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
                )}
                <Text style={styles.quickActionLabel}>{action.label}</Text>
                <Text style={styles.quickActionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About Button */}
        <View style={styles.aboutSection}>
          <TouchableOpacity
            style={styles.aboutButton}
            onPress={() => {
              console.log('User tapped About button');
              router.push('/about');
            }}
          >
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.aboutButtonText}>About</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  loginHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  statusContainer: {
    width: '100%',
    marginTop: 16,
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
  customIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  aboutSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
