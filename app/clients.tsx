
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { SpeechToTextButton } from '@/components/SpeechToTextButton';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { getClients, createClient, updateClient, deleteClient, Client } from '@/utils/supabaseHelpers';
import { geocodeAddress, getStaticMapUrl, Location } from '@/utils/googleMaps';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';

const GOOGLE_MAPS_AUTOCOMPLETE_ENDPOINT = Constants.expoConfig?.extra?.googleMapsAutocompleteEndpoint || '';
const GOOGLE_MAPS_GEOCODE_ENDPOINT = Constants.expoConfig?.extra?.googleMapsGeocodeEndpoint || '';

export default function ClientsScreen() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    notes: '',
    tasks: '',
  });
  const [geocoding, setGeocoding] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      console.log('[Clients] Loading clients from Supabase...');
      
      const clientsData = await getClients();
      console.log('[Clients] Loaded clients:', clientsData);
      setClients(clientsData);
    } catch (error) {
      console.error('[Clients] Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = async (text: string) => {
    setNewClient({ ...newClient, address: text });
    
    if (text.length > 3 && GOOGLE_MAPS_AUTOCOMPLETE_ENDPOINT) {
      try {
        console.log('[Clients] Fetching address suggestions for:', text);
        const response = await fetch(`${GOOGLE_MAPS_AUTOCOMPLETE_ENDPOINT}?input=${encodeURIComponent(text)}`);
        const data = await response.json();
        
        if (data.predictions && data.predictions.length > 0) {
          const suggestions = data.predictions.map((p: any) => p.description);
          setAddressSuggestions(suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('[Clients] Error fetching address suggestions:', error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectAddressSuggestion = (address: string) => {
    setNewClient({ ...newClient, address });
    setShowSuggestions(false);
  };

  const handleAddClient = async () => {
    if (!newClient.name.trim() || !newClient.address.trim()) {
      Alert.alert('Error', 'Please enter client name and address');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add clients');
      return;
    }

    try {
      setGeocoding(true);
      console.log('[Clients] Geocoding address:', newClient.address);
      
      let location: Location | null = null;
      
      if (GOOGLE_MAPS_GEOCODE_ENDPOINT) {
        try {
          const response = await fetch(`${GOOGLE_MAPS_GEOCODE_ENDPOINT}?address=${encodeURIComponent(newClient.address)}`);
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            location = {
              lat: data.results[0].geometry.location.lat,
              lng: data.results[0].geometry.location.lng,
            };
            console.log('[Clients] Geocoded location:', location);
          }
        } catch (geocodeError) {
          console.error('[Clients] Geocoding error:', geocodeError);
        }
      }
      
      await submitClient(location);
    } catch (error) {
      console.error('[Clients] Error adding client:', error);
      Alert.alert('Error', 'Failed to add client. Please try again.');
    } finally {
      setGeocoding(false);
    }
  };

  const submitClient = async (location: Location | null) => {
    try {
      console.log('[Clients] Creating client with location:', location);
      
      const clientData = {
        name: newClient.name.trim(),
        address: newClient.address.trim(),
        phone: newClient.phone.trim() || undefined,
        email: newClient.email.trim() || undefined,
        notes: newClient.notes.trim() || undefined,
        tasks: newClient.tasks.trim() || undefined,
        latitude: location?.lat,
        longitude: location?.lng,
        service_provider_id: user?.id || 'temp-provider-id',
      };

      const createdClient = await createClient(clientData);
      console.log('[Clients] Client created:', createdClient);
      
      setClients([createdClient, ...clients]);
      setNewClient({ name: '', address: '', phone: '', email: '', notes: '', tasks: '' });
      setShowAddForm(false);
      Alert.alert('Success', 'Client added successfully');
    } catch (error) {
      console.error('[Clients] Error submitting client:', error);
      throw error;
    }
  };

  const handleDeleteClient = (clientId: string) => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Clients] Deleting client:', clientId);
              await deleteClient(clientId);
              setClients(clients.filter(c => c.id !== clientId));
              Alert.alert('Success', 'Client deleted successfully');
            } catch (error) {
              console.error('[Clients] Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderClientCard = (client: Client) => {
    const hasLocation = client.latitude && client.longitude;
    const mapUrl = hasLocation
      ? getStaticMapUrl(client.latitude!, client.longitude!, 15, 600, 200)
      : null;

    return (
      <View key={client.id} style={styles.clientCard}>
        <View style={styles.clientHeader}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{client.name}</Text>
            <View style={styles.clientDetail}>
              <IconSymbol
                ios_icon_name="location"
                android_material_icon_name="location-on"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.clientDetailText}>{client.address}</Text>
            </View>
            {client.phone && (
              <View style={styles.clientDetail}>
                <IconSymbol
                  ios_icon_name="phone"
                  android_material_icon_name="phone"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.clientDetailText}>{client.phone}</Text>
              </View>
            )}
            {client.email && (
              <View style={styles.clientDetail}>
                <IconSymbol
                  ios_icon_name="mail"
                  android_material_icon_name="email"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.clientDetailText}>{client.email}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteClient(client.id)}
            style={styles.deleteButton}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={20}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>

        {client.tasks && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionLabel}>Medication & Support Tasks:</Text>
            <Text style={styles.sectionText}>{client.tasks}</Text>
          </View>
        )}

        {client.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>Notes:</Text>
            <Text style={styles.sectionText}>{client.notes}</Text>
          </View>
        )}

        {hasLocation && mapUrl ? (
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: mapUrl }}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <View style={styles.mapOverlay}>
              <IconSymbol
                ios_icon_name="map"
                android_material_icon_name="map"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.mapOverlayText}>
                {client.latitude?.toFixed(4)}, {client.longitude?.toFixed(4)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noMapContainer}>
            <IconSymbol
              ios_icon_name="map"
              android_material_icon_name="map"
              size={24}
              color={colors.textSecondary}
            />
            <Text style={styles.noMapText}>Location not available</Text>
          </View>
        )}
      </View>
    );
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
            title: 'Clients',
            headerShown: true,
            headerStyle: { backgroundColor: colors.secondary },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {!showAddForm && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.addButtonText}>Add New Client</Text>
            </TouchableOpacity>
          )}

          {showAddForm && (
            <View style={styles.addForm}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Add New Client</Text>
                <TouchableOpacity onPress={() => setShowAddForm(false)}>
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Client Name *"
                placeholderTextColor={colors.textSecondary}
                value={newClient.name}
                onChangeText={(text) => setNewClient({ ...newClient, name: text })}
              />

              <View style={styles.addressInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Address *"
                  placeholderTextColor={colors.textSecondary}
                  value={newClient.address}
                  onChangeText={handleAddressChange}
                  multiline
                />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {addressSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => selectAddressSuggestion(suggestion)}
                      >
                        <IconSymbol
                          ios_icon_name="location"
                          android_material_icon_name="location-on"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.textSecondary}
                value={newClient.phone}
                onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                value={newClient.email}
                onChangeText={(text) => setNewClient({ ...newClient, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.inputWithMic}>
                <TextInput
                  style={[styles.input, styles.inputWithButton]}
                  placeholder="Medication & Support Tasks"
                  placeholderTextColor={colors.textSecondary}
                  value={newClient.tasks}
                  onChangeText={(text) => setNewClient({ ...newClient, tasks: text })}
                  multiline
                  numberOfLines={3}
                />
                <SpeechToTextButton
                  onTranscription={(text) => setNewClient({ ...newClient, tasks: newClient.tasks + ' ' + text })}
                  style={styles.micButton}
                />
              </View>

              <View style={styles.inputWithMic}>
                <TextInput
                  style={[styles.input, styles.inputWithButton]}
                  placeholder="Notes"
                  placeholderTextColor={colors.textSecondary}
                  value={newClient.notes}
                  onChangeText={(text) => setNewClient({ ...newClient, notes: text })}
                  multiline
                  numberOfLines={3}
                />
                <SpeechToTextButton
                  onTranscription={(text) => setNewClient({ ...newClient, notes: newClient.notes + ' ' + text })}
                  style={styles.micButton}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, geocoding && styles.submitButtonDisabled]}
                onPress={handleAddClient}
                disabled={geocoding}
                activeOpacity={0.7}
              >
                {geocoding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitButtonText}>Add Client</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading clients...</Text>
            </View>
          ) : clients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="person.3"
                android_material_icon_name="group"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No clients yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first client to get started
              </Text>
            </View>
          ) : (
            <View style={styles.clientsList}>
              {clients.map(renderClientCard)}
            </View>
          )}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressInputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  suggestionsContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -12,
    marginBottom: 12,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  inputWithMic: {
    position: 'relative',
    marginBottom: 12,
  },
  inputWithButton: {
    paddingRight: 48,
    marginBottom: 0,
  },
  micButton: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  clientsList: {
    gap: 16,
  },
  clientCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  clientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  clientDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  tasksSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  notesSection: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: 200,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  noMapContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMapText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
