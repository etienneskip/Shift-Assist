
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPost, BACKEND_URL } from '@/utils/api';
import { sendShiftNotification } from '@/utils/pushNotifications';

interface Shift {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  location: string;
  client: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  worker?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface ShiftNote {
  id: string;
  note_type: string;
  content: string;
  voice_note_url: string | null;
  worker: {
    name: string;
  };
  created_at: string;
}

export default function ShiftDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'progress' | 'medication' | 'incident' | 'general'>('progress');
  const [loading, setLoading] = useState(true);
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadShiftDetails();
      } else {
        router.replace('/auth');
      }
    }
  }, [id, user, authLoading]);

  const loadShiftDetails = async () => {
    try {
      setLoading(true);
      console.log('[ShiftDetails] Loading shift details for:', id, 'from:', BACKEND_URL);
      
      if (!user || !id) {
        console.log('[ShiftDetails] No user or shift ID found');
        return;
      }

      // GET /api/shifts/:id - Get a shift by ID
      const shiftResponse = await authenticatedGet<any>(`/api/shifts/${id}`);
      console.log('[ShiftDetails] Shift response:', shiftResponse);
      
      // Transform the response to match the expected interface
      const transformedShift: Shift = {
        id: shiftResponse.id,
        title: shiftResponse.title,
        description: shiftResponse.description || '',
        start_time: shiftResponse.startTime || shiftResponse.start_time,
        end_time: shiftResponse.endTime || shiftResponse.end_time,
        status: shiftResponse.status || 'pending',
        location: shiftResponse.location || '',
        client: {
          id: shiftResponse.client?.id || shiftResponse.clientId || '',
          name: shiftResponse.client?.name || shiftResponse.clientName || 'Unknown Client',
          address: shiftResponse.client?.address || shiftResponse.location || '',
          phone: shiftResponse.client?.phone || '',
        },
        worker: shiftResponse.worker ? {
          id: shiftResponse.worker.id,
          name: shiftResponse.worker.name,
          phone: shiftResponse.worker.phone || '',
        } : undefined,
      };
      
      setShift(transformedShift);

      // GET /api/timesheets?shiftId=:shiftId&userId=:userId - Get active timesheet for this shift
      const timesheetsResponse = await authenticatedGet<any[]>(`/api/timesheets?shiftId=${id}&userId=${user.id}`);
      console.log('[ShiftDetails] Timesheets response:', timesheetsResponse);
      
      if (timesheetsResponse && timesheetsResponse.length > 0) {
        const activeTs = timesheetsResponse.find((ts: any) => 
          ts.status === 'draft' || !ts.endTime && !ts.end_time
        );
        setActiveTimesheet(activeTs);
      }

      // Note: The API doesn't have a notes endpoint, so we'll skip loading notes for now
      setNotes([]);
    } catch (error) {
      console.error('[ShiftDetails] Error loading shift details:', error);
      Alert.alert('Error', 'Failed to load shift details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      console.log('[ShiftDetails] Adding note:', { noteType, content: newNote });
      // Note: The API doesn't have a notes endpoint in the OpenAPI spec
      // This would need to be implemented on the backend
      Alert.alert('Info', 'Note functionality is not yet available in the backend API.');
      setNewNote('');
    } catch (error) {
      console.error('[ShiftDetails] Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    }
  };

  const handleClockIn = async () => {
    try {
      console.log('[ShiftDetails] Clocking in to shift:', id);
      
      if (!user || !id) {
        Alert.alert('Error', 'User or shift information missing');
        return;
      }

      // POST /api/timesheets - Create a new timesheet with clock-in time
      const timesheetData = {
        shiftId: id,
        supportWorkerId: user.id,
        startTime: new Date().toISOString(),
        breakMinutes: 0,
        notes: '',
      };

      const response = await authenticatedPost('/api/timesheets', timesheetData);
      console.log('[ShiftDetails] Clock in response:', response);
      
      Alert.alert('Success', 'Clocked in successfully!');
      loadShiftDetails();
    } catch (error) {
      console.error('[ShiftDetails] Error clocking in:', error);
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    }
  };

  const handleClockOut = async () => {
    try {
      console.log('[ShiftDetails] Clocking out from shift:', id);
      
      if (!activeTimesheet) {
        Alert.alert('Error', 'No active timesheet found');
        return;
      }

      // PATCH /api/timesheets/:id - Update the timesheet with clock-out time
      const updateData = {
        endTime: new Date().toISOString(),
        status: 'pending',
      };

      const { authenticatedPatch } = await import('@/utils/api');
      const response = await authenticatedPatch(`/api/timesheets/${activeTimesheet.id}`, updateData);
      console.log('[ShiftDetails] Clock out response:', response);
      
      Alert.alert('Success', 'Clocked out successfully!');
      router.back();
    } catch (error) {
      console.error('[ShiftDetails] Error clocking out:', error);
      Alert.alert('Error', 'Failed to clock out. Please try again.');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Shift Details',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: '#1E3A5F',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading shift details...</Text>
            </View>
          ) : shift ? (
            <>
              <View style={styles.card}>
                <Text style={styles.shiftTitle}>{shift.title}</Text>
                <Text style={styles.shiftDescription}>{shift.description}</Text>
                
                <View style={styles.detailRow}>
                  <IconSymbol 
                    ios_icon_name="calendar" 
                    android_material_icon_name="calendar-today" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={styles.detailText}>{formatDate(shift.start_time)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <IconSymbol 
                    ios_icon_name="clock" 
                    android_material_icon_name="schedule" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={styles.detailText}>
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <IconSymbol 
                    ios_icon_name="person.fill" 
                    android_material_icon_name="person" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={styles.detailText}>{shift.client.name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <IconSymbol 
                    ios_icon_name="location.fill" 
                    android_material_icon_name="location-on" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={styles.detailText}>{shift.client.address}</Text>
                </View>

                {shift.client.phone && (
                  <View style={styles.detailRow}>
                    <IconSymbol 
                      ios_icon_name="phone.fill" 
                      android_material_icon_name="phone" 
                      size={20} 
                      color={colors.primary} 
                    />
                    <Text style={styles.detailText}>{shift.client.phone}</Text>
                  </View>
                )}
              </View>

              {!activeTimesheet && (
                <TouchableOpacity style={styles.clockInButton} onPress={handleClockIn}>
                  <IconSymbol 
                    ios_icon_name="play.circle.fill" 
                    android_material_icon_name="play-arrow" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.clockInButtonText}>Clock In</Text>
                </TouchableOpacity>
              )}

              {activeTimesheet && !activeTimesheet.end_time && (
                <TouchableOpacity 
                  style={[styles.clockInButton, { backgroundColor: colors.danger }]} 
                  onPress={handleClockOut}
                >
                  <IconSymbol 
                    ios_icon_name="stop.circle.fill" 
                    android_material_icon_name="stop" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.clockInButtonText}>Clock Out</Text>
                </TouchableOpacity>
              )}

              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Shift Notes</Text>
                
                <View style={styles.addNoteContainer}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add a note about this shift..."
                    placeholderTextColor={colors.textSecondary}
                    value={newNote}
                    onChangeText={setNewNote}
                    multiline
                  />
                  <TouchableOpacity style={styles.addNoteButton} onPress={handleAddNote}>
                    <Text style={styles.addNoteButtonText}>Add Note</Text>
                  </TouchableOpacity>
                </View>

                {notes.map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteType}>{note.note_type}</Text>
                      <Text style={styles.noteDate}>
                        {new Date(note.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.noteContent}>{note.content}</Text>
                    <Text style={styles.noteAuthor}>By {note.worker.name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Shift not found</Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  shiftDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  clockInButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  clockInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  notesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  addNoteContainer: {
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addNoteButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  noteDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noteContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
