
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

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy Policy',
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
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: January 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect information that you provide directly to us, including your name, email address, phone number, and any other information you choose to provide when using Shift Assist.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use the information we collect to provide, maintain, and improve our services, including to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Manage shifts and schedules</Text>
            <Text style={styles.bulletItem}>• Track timesheets and attendance</Text>
            <Text style={styles.bulletItem}>• Store and manage documents</Text>
            <Text style={styles.bulletItem}>• Send notifications about shifts and updates</Text>
            <Text style={styles.bulletItem}>• Generate reports and analytics</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>3. Information Sharing</Text>
          <Text style={styles.sectionText}>
            We do not share your personal information with third parties except as necessary to provide our services or as required by law. Service providers can view information about their assigned support workers and clients.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>4. Data Security</Text>
          <Text style={styles.sectionText}>
            We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>5. Data Retention</Text>
          <Text style={styles.sectionText}>
            We retain your information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with legal obligations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>6. Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to access, update, or delete your personal information at any time. You can do this through your account settings or by contacting us directly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>7. Location Data</Text>
          <Text style={styles.sectionText}>
            We may collect location data to help you navigate to client addresses and track shift locations. You can disable location services in your device settings at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>8. Push Notifications</Text>
          <Text style={styles.sectionText}>
            We may send you push notifications about shifts, timesheets, and other important updates. You can opt out of receiving push notifications through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>9. Children&apos;s Privacy</Text>
          <Text style={styles.sectionText}>
            Our service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>10. Changes to Privacy Policy</Text>
          <Text style={styles.sectionText}>
            We may update this privacy policy from time to time. We will notify you of any changes by updating the &quot;Last updated&quot; date at the top of this policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>11. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about this Privacy Policy, please contact us through the app support channels.
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
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 8,
    gap: 6,
  },
  bulletItem: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
