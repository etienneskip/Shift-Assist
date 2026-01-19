
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Terms & Conditions',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={styles.lastUpdated}>Last updated: January 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using Shift Assist, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>2. Use License</Text>
          <Text style={styles.sectionText}>
            Permission is granted to temporarily use Shift Assist for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>3. User Accounts</Text>
          <Text style={styles.sectionText}>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>4. Service Provider Responsibilities</Text>
          <Text style={styles.sectionText}>
            Service providers must ensure accurate information is provided for all clients and shifts. They are responsible for managing their team and approving timesheets in a timely manner.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>5. Support Worker Responsibilities</Text>
          <Text style={styles.sectionText}>
            Support workers must clock in and out accurately, submit progress notes promptly, and maintain up-to-date compliance documents.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>6. Data Accuracy</Text>
          <Text style={styles.sectionText}>
            Users are responsible for ensuring all data entered into the app is accurate and up-to-date. This includes shift information, timesheets, and client details.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>7. Prohibited Uses</Text>
          <Text style={styles.sectionText}>
            You may not use the app for any illegal purpose or to violate any laws. You may not attempt to gain unauthorized access to any portion of the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>8. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            Shift Assist shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>9. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We reserve the right to modify these terms at any time. We will notify users of any changes by updating the &quot;Last updated&quot; date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>10. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms & Conditions, please contact us through the app support channels.
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
