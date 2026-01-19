
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { router, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { getServiceProviderByUserId, ServiceProvider } from '@/utils/supabaseHelpers';

interface DashboardMenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

export default function ServiceProviderDashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  const loadProviderData = async () => {
    console.log('[ServiceProviderDashboard] Loading provider data for user:', user?.id);
    
    if (!user?.id) {
      console.log('[ServiceProviderDashboard] No user found');
      setLoading(false);
      return;
    }

    try {
      const providerData = await getServiceProviderByUserId(user.id);
      
      if (providerData) {
        console.log('[ServiceProviderDashboard] Provider loaded:', providerData);
        setProvider(providerData);
      } else {
        console.log('[ServiceProviderDashboard] No provider found for user');
        Alert.alert(
          'No Account Found',
          'Please create a service provider account first',
          [
            {
              text: 'Create Account',
              onPress: () => router.replace('/create-service-provider-account'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('[ServiceProviderDashboard] Error loading provider:', error);
      Alert.alert('Error', 'Failed to load your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const menuItems: DashboardMenuItem[] = [
    {
      id: 'clients',
      title: 'Manage Clients',
      description: 'Add, view, and manage your clients',
      icon: 'people',
      route: '/clients',
      color: colors.primary,
    },
    {
      id: 'workers',
      title: 'Support Workers',
      description: 'View and manage your support workers',
      icon: 'group',
      route: '/support-workers',
      color: '#10B981',
    },
    {
      id: 'shifts',
      title: 'Assign Shifts',
      description: 'Create and assign shifts to workers',
      icon: 'schedule',
      route: '/clients',
      color: '#F59E0B',
    },
    {
      id: 'reports',
      title: 'Pull Reports',
      description: 'Generate and view reports',
      icon: 'assessment',
      route: '/reports',
      color: '#8B5CF6',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Manage your account settings',
      icon: 'settings',
      route: '/service-provider-settings',
      color: '#6B7280',
    },
  ];

  const tabs: TabBarItem[] = [
    {
      name: 'dashboard',
      route: '/service-provider-dashboard',
      icon: 'home',
      label: 'Dashboard',
    },
    {
      name: 'clients',
      route: '/clients',
      icon: 'people',
      label: 'Clients',
    },
    {
      name: 'workers',
      route: '/support-workers',
      icon: 'group',
      label: 'Workers',
    },
    {
      name: 'reports',
      route: '/reports',
      icon: 'assessment',
      label: 'Reports',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.loadingContainer}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.errorText}>No service provider account found</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.replace('/create-service-provider-account')}
        >
          <Text style={styles.createButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Service Provider Dashboard',
            headerStyle: {
              backgroundColor: colors.secondary,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
            },
          }}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.companyName}>{provider.company_name}</Text>
            <Text style={styles.welcomeSubtitle}>
              Manage your clients, workers, and shifts all in one place
            </Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={styles.menuCard}
                onPress={() => {
                  console.log(`[ServiceProviderDashboard] User tapped ${item.title}`);
                  router.push(item.route as any);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                  <IconSymbol
                    ios_icon_name={item.icon}
                    android_material_icon_name={item.icon}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                Use the menu above to navigate to different sections of your dashboard
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcomeTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },
  menuSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
