
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

export default function HelpScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Help',
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
          <Text style={styles.sectionTitle}>About Shift Assist</Text>
          <Text style={styles.sectionText}>
            Shift Assist is a professional, user-friendly mobile app designed for NDIS service providers and support workers to manage shifts, compliance, and client care with ease.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Shift management and scheduling</Text>
            <Text style={styles.featureItem}>• Timesheet tracking and approval</Text>
            <Text style={styles.featureItem}>• Document management and compliance</Text>
            <Text style={styles.featureItem}>• Client and worker coordination</Text>
            <Text style={styles.featureItem}>• Real-time notifications</Text>
            <Text style={styles.featureItem}>• Progress notes and reporting</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For Service Providers</Text>
          <Text style={styles.sectionText}>
            Manage your team, assign shifts, approve timesheets, and generate reports all in one place. Create client profiles, track worker availability, and streamline your operations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For Support Workers</Text>
          <Text style={styles.sectionText}>
            View your shifts, clock in/out, submit notes, manage documents, and track your timesheets effortlessly. Stay connected with your service providers and access all your work information in one app.
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
