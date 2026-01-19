
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
import { createServiceProvider } from '@/utils/supabaseHelpers';

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function CreateServiceProviderAccountScreen() {
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  console.log('CreateServiceProviderAccountScreen loaded for user:', user?.id);

  // Redirect to auth if not logged in after auth loading completes
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[CreateServiceProvider] User not logged in, redirecting to auth');
      Alert.alert(
        'Authentication Required',
        'Please sign in or create an account to continue',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth?role=service-provider'),
          },
        ]
      );
    }
  }, [authLoading, user]);

  const handleSaveChanges = async () => {
    console.log('User tapped Save Changes button');

    if (!user?.id) {
      console.log('[CreateServiceProvider] No user ID, redirecting to auth');
      Alert.alert(
        'Authentication Required',
        'Please sign in to create a service provider account',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/auth?role=service-provider'),
          },
        ]
      );
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
    console.log('Creating service provider account with data:', {
      user_id: user.id,
      company_name: companyName,
      abn: abn || null,
      contact_person: contactPerson || null,
      email: email,
      phone: phone,
      address: address || null,
      description: description || null,
    });

    try {
      // Create service provider record in Supabase
      const newProvider = await createServiceProvider({
        user_id: user.id,
        company_name: companyName,
        abn: abn || null,
        contact_person: contactPerson || null,
        email: email,
        phone: phone,
        address: address || null,
        description: description || null,
      });

      console.log('Service provider account created successfully:', newProvider);

      Alert.alert(
        'Success',
        'Your service provider account has been created!',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('Navigating to Service Provider Settings');
              router.replace('/service-provider-settings');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating service provider account:', error);
      Alert.alert('Error', 'Failed to create service provider account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Show error if not logged in
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Create Service Provider Account',
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
          }}
        />
        <IconSymbol
          ios_icon_name="person.circle"
          android_material_icon_name="account-circle"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.errorText}>
          You need to be signed in to create a service provider account.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace('/auth?role=service-provider')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
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
          title: 'Create Service Provider Account',
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
        <Text style={styles.header}>Service Provider Details</Text>
        <Text style={styles.subtitle}>
          Please fill in your organization details to get started
        </Text>

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
          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact person name"
            placeholderTextColor={colors.textSecondary}
            value={contactPerson}
            onChangeText={setContactPerson}
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
    </KeyboardAvoidingView>
  );
}
