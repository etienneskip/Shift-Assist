
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
  Image,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { authenticatedGet } from '@/utils/api';

interface Shift {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  client: string;
}

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  createdAt: string;
  url: string;
}

interface Timesheet {
  id: string;
  shiftId: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  notes: string;
  status: string;
  shift: {
    title: string;
    client: string;
  };
}

type TabType = 'shifts' | 'documents' | 'timesheets';

export default function SupportWorkerDetailsScreen() {
  const { id } = useLocalSearchParams();
  const workerId = Array.isArray(id) ? id[0] : id;

  const [activeTab, setActiveTab] = useState<TabType>('shifts');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log(`[SupportWorkerDetails] Loading ${activeTab} for worker:`, workerId);

      if (activeTab === 'shifts') {
        // GET /api/service-providers/workers/:workerId/shifts - Get shifts for a support worker
        const response = await authenticatedGet<any[]>(`/api/service-providers/workers/${workerId}/shifts`);
        
        // Transform the response to match the expected interface
        const transformedShifts: Shift[] = response.map((shift: any) => ({
          id: shift.id,
          title: shift.title,
          startTime: shift.startTime || shift.start_time,
          endTime: shift.endTime || shift.end_time,
          location: shift.location || '',
          status: shift.status || 'pending',
          client: shift.client?.name || shift.clientName || 'Unknown Client',
        }));
        
        setShifts(transformedShifts);
      } else if (activeTab === 'documents') {
        // GET /api/service-providers/workers/:workerId/compliance-documents - Get compliance documents for a support worker
        const response = await authenticatedGet<any[]>(`/api/service-providers/workers/${workerId}/compliance-documents`);
        
        // Transform the response to match the expected interface
        const transformedDocuments: Document[] = response.map((doc: any) => ({
          id: doc.id,
          fileName: doc.fileName || doc.documentName || 'Unknown',
          fileType: doc.fileType || doc.documentType || 'document',
          documentType: doc.documentType || doc.type || 'other',
          createdAt: doc.createdAt || doc.uploadedAt || new Date().toISOString(),
          url: doc.url || doc.fileUrl || '',
        }));
        
        setDocuments(transformedDocuments);
      } else if (activeTab === 'timesheets') {
        // GET /api/service-providers/workers/:workerId/timesheets - Get timesheets for a support worker
        const response = await authenticatedGet<any[]>(`/api/service-providers/workers/${workerId}/timesheets`);
        
        // Transform the response to match the expected interface
        const transformedTimesheets: Timesheet[] = response.map((ts: any) => ({
          id: ts.id,
          shiftId: ts.shiftId || ts.shift_id,
          startTime: ts.startTime || ts.start_time,
          endTime: ts.endTime || ts.end_time,
          totalHours: ts.totalHours || ts.total_hours || 0,
          notes: ts.notes || '',
          status: ts.status || 'pending',
          shift: {
            title: ts.shift?.title || 'Unknown Shift',
            client: ts.shift?.client?.name || ts.shift?.clientName || 'Unknown Client',
          },
        }));
        
        setTimesheets(transformedTimesheets);
      }
    } catch (error) {
      console.error(`[SupportWorkerDetails] Error loading ${activeTab}:`, error);
      Alert.alert('Error', `Failed to load ${activeTab}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const renderShifts = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (shifts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="calendar" 
            android_material_icon_name="calendar-today" 
            size={48} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>No shifts found</Text>
        </View>
      );
    }

    return (
      <React.Fragment>
        {shifts.map((shift, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{shift.title}</Text>
              <View style={[
                styles.statusBadge,
                shift.status === 'completed' ? styles.statusCompleted : styles.statusPending
              ]}>
                <Text style={styles.statusText}>{shift.status}</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              <IconSymbol 
                ios_icon_name="person" 
                android_material_icon_name="person" 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.cardText}>{shift.client}</Text>
            </View>
            <View style={styles.cardRow}>
              <IconSymbol 
                ios_icon_name="clock" 
                android_material_icon_name="access-time" 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.cardText}>
                {new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <IconSymbol 
                ios_icon_name="location" 
                android_material_icon_name="location-on" 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.cardText}>{shift.location}</Text>
            </View>
          </View>
        ))}
      </React.Fragment>
    );
  };

  const renderDocuments = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (documents.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="doc" 
            android_material_icon_name="description" 
            size={48} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>No documents found</Text>
        </View>
      );
    }

    return (
      <React.Fragment>
        {documents.map((doc, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.documentIcon}>
                <IconSymbol 
                  ios_icon_name="doc" 
                  android_material_icon_name="description" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.cardTitle}>{doc.fileName}</Text>
                <Text style={styles.documentType}>{doc.documentType}</Text>
              </View>
            </View>
            <Text style={styles.documentDate}>
              Uploaded {new Date(doc.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </React.Fragment>
    );
  };

  const renderTimesheets = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (timesheets.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="clock" 
            android_material_icon_name="access-time" 
            size={48} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>No timesheets found</Text>
        </View>
      );
    }

    return (
      <React.Fragment>
        {timesheets.map((timesheet, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{timesheet.shift.title}</Text>
              <View style={[
                styles.statusBadge,
                timesheet.status === 'approved' ? styles.statusCompleted : styles.statusPending
              ]}>
                <Text style={styles.statusText}>{timesheet.status}</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              <IconSymbol 
                ios_icon_name="person" 
                android_material_icon_name="person" 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.cardText}>{timesheet.shift.client}</Text>
            </View>
            <View style={styles.cardRow}>
              <IconSymbol 
                ios_icon_name="clock" 
                android_material_icon_name="access-time" 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.cardText}>
                {new Date(timesheet.startTime).toLocaleString()} - {new Date(timesheet.endTime).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <IconSymbol 
                ios_icon_name="timer" 
                android_material_icon_name="schedule" 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.cardText}>{timesheet.totalHours} hours</Text>
            </View>
            {timesheet.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{timesheet.notes}</Text>
              </View>
            )}
          </View>
        ))}
      </React.Fragment>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Support Worker Details',
          headerStyle: {
            backgroundColor: colors.secondary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shifts' && styles.tabActive]}
          onPress={() => setActiveTab('shifts')}
        >
          <Text style={[styles.tabText, activeTab === 'shifts' && styles.tabTextActive]}>
            Shifts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
            Documents
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timesheets' && styles.tabActive]}
          onPress={() => setActiveTab('timesheets')}
        >
          <Text style={[styles.tabText, activeTab === 'timesheets' && styles.tabTextActive]}>
            Timesheets
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'shifts' && renderShifts()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'timesheets' && renderTimesheets()}
      </ScrollView>

      {activeTab === 'timesheets' && timesheets.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.generatePayslipButton}
            onPress={() => router.push(`/generate-payslip/${workerId}` as any)}
          >
            <IconSymbol 
              ios_icon_name="doc.text" 
              android_material_icon_name="receipt" 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.generatePayslipButtonText}>Generate Payslip</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#10B981' + '20',
  },
  statusPending: {
    backgroundColor: '#F59E0B' + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  documentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.highlight,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generatePayslipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generatePayslipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
