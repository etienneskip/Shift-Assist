
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
import {
  getShiftWorkers,
  getServiceProviders,
  getSupportWorkerProviders,
  ShiftWorker,
  ServiceProvider,
} from '@/utils/supabaseHelpers';

interface SupportWorkerWithProviders extends ShiftWorker {
  providers: ServiceProvider[];
}

export default function SupportWorkersScreen() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<SupportWorkerWithProviders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupportWorkers();
  }, []);

  const loadSupportWorkers = async () => {
    try {
      setLoading(true);
      console.log('[SupportWorkers] Loading support workers for user:', user?.id);
      
      const allProviders = await getServiceProviders();
      const userProvider = allProviders.find((p) => p.user_id === user?.id);
      
      if (!userProvider) {
        console.log('[SupportWorkers] No service provider found for user');
        setWorkers([]);
        return;
      }

      console.log('[SupportWorkers] User is service provider:', userProvider.id);

      const allWorkers = await getShiftWorkers();
      console.log('[SupportWorkers] All workers:', allWorkers);

      const workersWithProviders: SupportWorkerWithProviders[] = [];
      
      for (const worker of allWorkers) {
        try {
          const workerProviderLinks = await getSupportWorkerProviders(worker.id);
          console.log('[SupportWorkers] Worker', worker.id, 'linked to providers:', workerProviderLinks);
          
          const isLinkedToUser = workerProviderLinks.some(
            (link) => link.service_provider_id === userProvider.id
          );
          
          if (isLinkedToUser) {
            const workerProviders = allProviders.filter((p) =>
              workerProviderLinks.some((link) => link.service_provider_id === p.id)
            );
            
            workersWithProviders.push({
              ...worker,
              providers: workerProviders,
            });
          }
        } catch (error) {
          console.error('[SupportWorkers] Error loading providers for worker:', worker.id, error);
        }
      }

      console.log('[SupportWorkers] Workers linked to this provider:', workersWithProviders);
      setWorkers(workersWithProviders);
    } catch (error) {
      console.error('[SupportWorkers] Error loading workers:', error);
      Alert.alert('Error', 'Failed to load support workers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerPress = (workerId: string) => {
    console.log('[SupportWorkers] User tapped worker:', workerId);
    router.push(`/support-worker-details/${workerId}` as any);
  };

  const tabs: TabBarItem[] = [
    {
      name: 'settings',
      route: '/service-provider-settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      name: 'workers',
      route: '/support-workers',
      icon: 'group',
      label: 'Workers',
    },
    {
      name: 'clients',
      route: '/clients',
      icon: 'people',
      label: 'Clients',
    },
    {
      name: 'reports',
      route: '/reports',
      icon: 'assessment',
      label: 'Reports',
    },
  ];

  return (
    <>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Support Workers',
            headerStyle: {
              backgroundColor: colors.secondary,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
            },
          }}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading support workers...</Text>
          </View>
        ) : workers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol 
              ios_icon_name="person.3" 
              android_material_icon_name="group" 
              size={64} 
              color={colors.textSecondary} 
            />
            <Text style={styles.emptyTitle}>No Support Workers</Text>
            <Text style={styles.emptyText}>
              You don&apos;t have any support workers linked to your account yet.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {workers.map((worker, index) => (
              <TouchableOpacity
                key={`${worker.id}-${index}`}
                style={styles.workerCard}
                onPress={() => handleWorkerPress(worker.id)}
                activeOpacity={0.7}
              >
                <View style={styles.workerAvatar}>
                  <IconSymbol
                    ios_icon_name="person.circle"
                    android_material_icon_name="person"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerEmail}>{worker.email}</Text>
                  <View style={styles.workerMeta}>
                    <View style={[
                      styles.statusBadge,
                      worker.status === 'active' ? styles.statusActive : styles.statusInactive
                    ]}>
                      <Text style={styles.statusText}>
                        {worker.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    {worker.providers.length > 1 && (
                      <Text style={styles.providersText}>
                        Works for {worker.providers.length} providers
                      </Text>
                    )}
                  </View>
                </View>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron-right" 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  workerEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#10B981' + '20',
  },
  statusInactive: {
    backgroundColor: colors.textSecondary + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  providersText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
