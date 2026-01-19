
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';
import { getStaticMapUrlForMultipleLocations, Location } from '@/utils/googleMaps';

interface Client {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

const { width } = Dimensions.get('window');

export default function ClientsMapScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string>('');

  useEffect(() => {
    loadClientsAndGenerateMap();
  }, []);

  const loadClientsAndGenerateMap = async () => {
    try {
      setLoading(true);
      console.log('[Clients Map] Loading clients...');
      
      // GET /api/clients - Returns array of clients with geocoded coordinates
      const response = await authenticatedGet<Client[]>('/api/clients');
      console.log('[Clients Map] Loaded clients:', response);
      
      setClients(response);

      // Filter clients with valid coordinates
      const clientsWithLocation = response.filter(
        (c) => c.latitude && c.longitude
      );

      if (clientsWithLocation.length > 0) {
        const locations: Location[] = clientsWithLocation.map((c) => ({
          lat: c.latitude!,
          lng: c.longitude!,
        }));

        const url = getStaticMapUrlForMultipleLocations(
          locations,
          Math.floor(width - 32),
          400
        );
        
        console.log('[Clients Map] Generated map URL for', locations.length, 'locations');
        setMapUrl(url);
      }
    } catch (error) {
      console.error('[Clients Map] Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const clientsWithLocation = clients.filter((c) => c.latitude && c.longitude);
  const clientsWithoutLocation = clients.filter((c) => !c.latitude || !c.longitude);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Clients Map',
          headerShown: true,
          headerStyle: { backgroundColor: colors.secondary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        ) : (
          <>
            {mapUrl ? (
              <View style={styles.mapSection}>
                <View style={styles.mapHeader}>
                  <IconSymbol
                    ios_icon_name="map"
                    android_material_icon_name="map"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.mapTitle}>All Client Locations</Text>
                </View>
                <View style={styles.mapContainer}>
                  <Image
                    source={{ uri: mapUrl }}
                    style={styles.mapImage}
                    resizeMode="cover"
                  />
                  <View style={styles.mapBadge}>
                    <Text style={styles.mapBadgeText}>
                      {clientsWithLocation.length} {clientsWithLocation.length === 1 ? 'location' : 'locations'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noMapContainer}>
                <IconSymbol
                  ios_icon_name="map"
                  android_material_icon_name="map"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.noMapText}>No client locations available</Text>
                <Text style={styles.noMapSubtext}>
                  Add clients with addresses to see them on the map
                </Text>
              </View>
            )}

            {clientsWithLocation.length > 0 && (
              <View style={styles.clientsSection}>
                <Text style={styles.sectionTitle}>
                  Clients with Locations ({clientsWithLocation.length})
                </Text>
                {clientsWithLocation.map((client) => (
                  <View key={client.id} style={styles.clientCard}>
                    <View style={styles.clientHeader}>
                      <IconSymbol
                        ios_icon_name="location"
                        android_material_icon_name="location-on"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.clientName}>{client.name}</Text>
                    </View>
                    <Text style={styles.clientAddress}>{client.address}</Text>
                    <View style={styles.coordinatesRow}>
                      <Text style={styles.coordinatesText}>
                        {client.latitude?.toFixed(4)}, {client.longitude?.toFixed(4)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {clientsWithoutLocation.length > 0 && (
              <View style={styles.clientsSection}>
                <Text style={styles.sectionTitle}>
                  Clients without Locations ({clientsWithoutLocation.length})
                </Text>
                <View style={styles.warningCard}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle"
                    android_material_icon_name="warning"
                    size={20}
                    color="#F59E0B"
                  />
                  <Text style={styles.warningText}>
                    These clients don&apos;t have geocoded locations. Edit them to add addresses.
                  </Text>
                </View>
                {clientsWithoutLocation.map((client) => (
                  <View key={client.id} style={styles.clientCard}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientAddress}>
                      {client.address || 'No address provided'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push('/clients')}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="person.3"
                android_material_icon_name="group"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.manageButtonText}>Manage Clients</Text>
            </TouchableOpacity>
          </>
        )}
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
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapImage: {
    width: '100%',
    height: 400,
  },
  mapBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noMapContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  noMapText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  noMapSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  clientsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  clientCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clientAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  manageButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
