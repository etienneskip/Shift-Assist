
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ServiceProvider {
  id: string;
  companyName: string;
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    loadServiceProviders();
  }, []);

  const loadServiceProviders = async () => {
    try {
      console.log('[Reports] Loading service providers');
      const response = await authenticatedGet<any>('/api/users/me');
      
      if (response.serviceProviders && response.serviceProviders.length > 0) {
        setServiceProviders(response.serviceProviders);
        setSelectedProviderId(response.serviceProviders[0].id);
        console.log('[Reports] Loaded service providers:', response.serviceProviders);
      } else {
        console.log('[Reports] No service providers found');
        Alert.alert('Error', 'No service provider account found. Please contact support.');
      }
    } catch (error) {
      console.error('[Reports] Error loading service providers:', error);
      Alert.alert('Error', 'Failed to load service provider information.');
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedProviderId) {
      Alert.alert('Error', 'Please select a service provider');
      return;
    }

    console.log('[Reports] User tapped Generate Report button');
    console.log('[Reports] Parameters:', {
      serviceProviderId: selectedProviderId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    try {
      setLoading(true);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const url = `${BACKEND_URL}/api/reports/service-provider-shifts?service_provider_id=${selectedProviderId}&startDate=${startDateStr}&endDate=${endDateStr}`;
      
      console.log('[Reports] Requesting PDF from:', url);

      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
        console.log('[Reports] PDF download initiated successfully');
        Alert.alert(
          'Success',
          'Report is being generated. The PDF will download shortly.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('[Reports] Cannot open URL:', url);
        Alert.alert('Error', 'Unable to open the report. Please try again.');
      }
    } catch (error) {
      console.error('[Reports] Error generating report:', error);
      Alert.alert(
        'Error',
        'Failed to generate report. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
            title: 'Shift Reports',
            headerStyle: {
              backgroundColor: colors.secondary,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
            },
          }}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerCard}>
            <IconSymbol
              ios_icon_name="doc.text"
              android_material_icon_name="description"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.headerTitle}>Generate Shift Report</Text>
            <Text style={styles.headerSubtitle}>
              Create a comprehensive PDF report of all shifts completed by your support workers
            </Text>
          </View>

          {serviceProviders.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Service Provider</Text>
              <View style={styles.pickerContainer}>
                {serviceProviders.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.providerOption,
                      selectedProviderId === provider.id && styles.providerOptionSelected,
                    ]}
                    onPress={() => setSelectedProviderId(provider.id)}
                  >
                    <View
                      style={[
                        styles.radioButton,
                        selectedProviderId === provider.id && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedProviderId === provider.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.providerOptionText,
                        selectedProviderId === provider.id && styles.providerOptionTextSelected,
                      ]}
                    >
                      {provider.companyName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date Range</Text>
            
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setStartDate(selectedDate);
                    console.log('[Reports] Start date changed to:', selectedDate);
                  }
                }}
                maximumDate={endDate}
              />
            )}

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setEndDate(selectedDate);
                    console.log('[Reports] End date changed to:', selectedDate);
                  }
                }}
                minimumDate={startDate}
                maximumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick Select</Text>
            <View style={styles.quickSelectContainer}>
              <TouchableOpacity
                style={styles.quickSelectButton}
                onPress={() => {
                  const today = new Date();
                  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setStartDate(lastWeek);
                  setEndDate(today);
                  console.log('[Reports] Quick select: Last 7 days');
                }}
              >
                <Text style={styles.quickSelectButtonText}>Last 7 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSelectButton}
                onPress={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setStartDate(lastMonth);
                  setEndDate(today);
                  console.log('[Reports] Quick select: Last 30 days');
                }}
              >
                <Text style={styles.quickSelectButtonText}>Last 30 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSelectButton}
                onPress={() => {
                  const today = new Date();
                  const lastQuarter = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                  setStartDate(lastQuarter);
                  setEndDate(today);
                  console.log('[Reports] Quick select: Last 90 days');
                }}
              >
                <Text style={styles.quickSelectButtonText}>Last 90 Days</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Report Contents</Text>
              <Text style={styles.infoText}>
                The report will include:
              </Text>
              <Text style={styles.infoListItem}>• Worker names</Text>
              <Text style={styles.infoListItem}>• Client names</Text>
              <Text style={styles.infoListItem}>• Shift dates and times</Text>
              <Text style={styles.infoListItem}>• Actual clock-in/out times</Text>
              <Text style={styles.infoListItem}>• Break minutes</Text>
              <Text style={styles.infoListItem}>• Total hours worked</Text>
              <Text style={styles.infoListItem}>• Summary statistics</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, loading && styles.generateButtonDisabled]}
            onPress={handleGenerateReport}
            disabled={loading}
          >
            {loading ? (
              <React.Fragment>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="arrow.down.doc"
                  android_material_icon_name="download"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.generateButtonText}>Generate PDF Report</Text>
              </React.Fragment>
            )}
          </TouchableOpacity>
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
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  providerOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  providerOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  providerOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickSelectButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  infoListItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    lineHeight: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 32,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
