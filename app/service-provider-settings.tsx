
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
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { supabaseSelect, supabaseUpdate } from '@/utils/supabase';
import { ServiceProvider } from '@/utils/supabaseHelpers';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuButtonText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
});

export default function ServiceProviderSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  console.log('ServiceProviderSettingsScreen loaded for user:', user?.id);

  useEffect(() => {
    loadProviderData();
  }, []);

  const loadProviderData = async () => {
    console.log('Loading service provider data from Supabase');
    setLoading(true);
    try {
      if (!user?.id) {
        console.log('No user ID found');
        setLoading(false);
        return;
      }

      // Get service provider by user_id
      const providers = await supabaseSelect<ServiceProvider>(
        'service_providers',
        '*',
        { 'user_id': `eq.${user.id}` }
      );

      if (providers.length > 0) {
        const provider = providers[0];
        console.log('Service provider loaded:', provider);

        setProviderId(provider.id);
        setCompanyName(provider.company_name || '');
        setAbn(provider.abn || '');
        setEmail(provider.email || '');
        setPhone(provider.phone || '');
        setAddress(provider.address || '');
        setDescription(provider.description || '');
      } else {
        console.log('No provider found for current user');
      }
    } catch (error) {
      console.error('Error loading service provider data:', error);
      Alert.alert('Error', 'Failed to load service provider data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    console.log('User tapped Save Changes button');

    if (!providerId) {
      Alert.alert('Error', 'No provider data found');
      return;
    }

    if (!companyName.trim()) {
      Alert.alert('Validation Error', 'Please enter a company name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter an email address');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter a phone number');
      return;
    }

    setSaving(true);
    console.log('Updating service provider with data:', {
      companyName,
      abn,
      email,
      phone,
      address,
      description,
    });

    try {
      // Update service provider in Supabase
      await supabaseUpdate<ServiceProvider>(
        'service_providers',
        {
          company_name: companyName,
          abn: abn || null,
          email: email,
          phone: phone,
          address: address || null,
          description: description || null,
          updated_at: new Date().toISOString(),
        },
        { 'id': `eq.${providerId}` }
      );

      console.log('Service provider updated successfully');
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error updating service provider:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading settings...</Text>
      </View>
    );
  }

  if (!providerId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 }}>
          No service provider account found. Please create one first.
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { marginTop: 20, marginHorizontal: 40 }]}
          onPress={() => router.push('/create-service-provider-account')}
        >
          <Text style={styles.saveButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Service Provider Settings',
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
          <Text style={styles.header}>Settings</Text>
          <Text style={styles.subtitle}>Manage your service provider account</Text>

          <Text style={[styles.header, { marginTop: 20 }]}>Company Information</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Company Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter company name"
              placeholderTextColor={colors.textSecondary}
              value={companyName}
              onChangeText={setCompanyName}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>ABN</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter ABN"
              placeholderTextColor={colors.textSecondary}
              value={abn}
              onChangeText={setAbn}
              keyboardType="numeric"
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
              placeholder="Enter business address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter a brief description of your services"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!saving}
            />
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
      </View>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
