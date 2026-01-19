
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router } from 'expo-router';
import { getServiceProviders, ServiceProvider, linkSupportWorkerToProvider } from '@/utils/supabaseHelpers';
import { supabaseInsert } from '@/utils/supabase';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providersList: {
    marginTop: 8,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerItemSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  providerDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default function CreateSupportWorkerAccountScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  console.log('CreateSupportWorkerAccountScreen loaded for user:', user?.id);

  useEffect(() => {
    loadServiceProviders();
  }, []);

  const loadServiceProviders = async () => {
    console.log('Loading service providers from Supabase');
    setLoading(true);
    try {
      const data = await getServiceProviders();
      console.log('Service providers loaded:', data.length);
      setProviders(data);
    } catch (error) {
      console.error('Error loading service providers:', error);
      Alert.alert('Error', 'Failed to load service providers');
    } finally {
      setLoading(false);
    }
  };

  const toggleProviderSelection = (providerId: string) => {
    console.log('Toggling provider selection:', providerId);
    setSelectedProviderIds((prev) => {
      if (prev.includes(providerId)) {
        return prev.filter((id) => id !== providerId);
      } else {
        return [...prev, providerId];
      }
    });
  };

  const handleSaveChanges = async () => {
    console.log('User tapped Save Changes button');

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create an account');
      return;
    }

    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter your last name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return;
    }

    if (selectedProviderIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one service provider');
      return;
    }

    setSaving(true);
    console.log('Creating support worker account with data:', {
      firstName,
      lastName,
      email,
      phone,
      address,
      selectedProviders: selectedProviderIds.length,
    });

    try {
      // Create support worker record in Supabase
      const newWorker = await supabaseInsert<any>('support_workers', {
        user_id: user.id,
        name: `${firstName} ${lastName}`,
        email: email,
        phone: phone,
        status: 'active',
      });

      console.log('Support worker account created:', newWorker);

      // Link support worker to selected service providers
      for (const providerId of selectedProviderIds) {
        await linkSupportWorkerToProvider(newWorker.id, providerId);
        console.log('Linked support worker to provider:', providerId);
      }

      console.log('All provider links created successfully');

      // Navigate to Support Worker Dashboard (Calendar)
      console.log('Navigating to Support Worker Dashboard');
      
      // Use setTimeout to ensure state updates before navigation
      setTimeout(() => {
        router.replace('/(tabs)/calendar');
      }, 100);
    } catch (error) {
      console.error('Error creating support worker account:', error);
      Alert.alert('Error', 'Failed to create support worker account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading service providers...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Create Support Worker Account',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Support Worker Details</Text>
        <Text style={styles.subtitle}>
          Please fill in your details and select the service providers you work for
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter first name"
            placeholderTextColor={colors.textSecondary}
            value={firstName}
            onChangeText={setFirstName}
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter last name"
            placeholderTextColor={colors.textSecondary}
            value={lastName}
            onChangeText={setLastName}
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your address"
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Service Providers *</Text>
          <Text style={styles.subtitle}>Select the providers you work for</Text>
          {providers.length === 0 ? (
            <Text style={styles.emptyText}>No service providers available</Text>
          ) : (
            <View style={styles.providersList}>
              {providers.map((provider, index) => {
                const isSelected = selectedProviderIds.includes(provider.id);
                return (
                  <TouchableOpacity
                    key={`${provider.id}-${index}`}
                    style={[styles.providerItem, isSelected && styles.providerItemSelected]}
                    onPress={() => toggleProviderSelection(provider.id)}
                    disabled={saving}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && (
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={16}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                    <View style={styles.providerInfo}>
                      <Text style={styles.providerName}>{provider.company_name}</Text>
                      {provider.email && (
                        <Text style={styles.providerDetails}>
                          Email: {provider.email}
                        </Text>
                      )}
                      {provider.phone && (
                        <Text style={styles.providerDetails}>Phone: {provider.phone}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSaveChanges}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
