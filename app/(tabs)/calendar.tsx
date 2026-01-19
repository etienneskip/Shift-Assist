
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';
import { router } from 'expo-router';

interface CalendarDay {
  date: number;
  dayOfWeek: string;
  hasShifts: boolean;
  shifts: any[];
}

export default function CalendarScreen() {
  const { user, loading: authLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState('JAN 2026');
  const [selectedDate, setSelectedDate] = useState(12);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadCalendar();
      } else {
        router.replace('/auth');
      }
    }
  }, [user, authLoading]);

  const loadCalendar = async () => {
    try {
      console.log('[Calendar] Loading calendar from:', BACKEND_URL);
      
      if (!user) {
        console.log('[Calendar] No user found, skipping load');
        return;
      }

      // Get user profile to determine role
      const userProfile = await authenticatedGet<any>('/api/users/me');
      const roles = userProfile.roles || [];
      const isServiceProvider = roles.includes('service_provider');
      setUserRole(isServiceProvider ? 'service_provider' : 'support_worker');

      // GET /api/shifts?userId=:userId - Get all shifts for the current user
      // This will return shifts based on the user's role (support worker or service provider)
      const shiftsResponse = await authenticatedGet<any[]>(
        `/api/shifts?userId=${user.id}`
      );
      console.log('[Calendar] Shifts response:', shiftsResponse);
      
      // Transform shifts to standardized format
      const transformedShifts = (shiftsResponse || []).map((shift: any) => ({
        id: shift.id,
        title: shift.title,
        start_time: shift.startTime || shift.start_time,
        end_time: shift.endTime || shift.end_time,
        location: shift.location || '',
        status: shift.status || 'pending',
      }));
      
      setAllShifts(transformedShifts);

      // Generate calendar days for display
      const days: CalendarDay[] = [];
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Get current date for display
      const currentDate = new Date();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), i).toISOString().split('T')[0];
        const dayShifts = transformedShifts.filter((shift: any) => {
          const shiftDate = new Date(shift.start_time).toISOString().split('T')[0];
          return shiftDate === dateStr;
        });

        days.push({
          date: i,
          dayOfWeek: daysOfWeek[new Date(currentDate.getFullYear(), currentDate.getMonth(), i).getDay()],
          hasShifts: dayShifts.length > 0,
          shifts: dayShifts,
        });
      }
      
      setCalendarDays(days);
      
      // Update current month display
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      setCurrentMonth(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
    } catch (error) {
      console.error('[Calendar] Error loading calendar:', error);
      Alert.alert('Error', 'Failed to load calendar. Please try again.');
    }
  };

  const handleRefresh = () => {
    loadCalendar();
  };

  const handleDateSelect = (date: number) => {
    setSelectedDate(date);
  };

  const renderCalendarHeader = () => (
    <View style={styles.calendarHeader}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>
          {userRole === 'service_provider' ? 'Shifts' : 'My Shifts'}
        </Text>
        <Text style={styles.monthText}>{currentMonth}</Text>
      </View>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <IconSymbol 
          ios_icon_name="arrow.clockwise" 
          android_material_icon_name="refresh" 
          size={24} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
    </View>
  );

  const renderWeekDays = () => (
    <View style={styles.weekDaysContainer}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
        <View key={index} style={styles.weekDayCell}>
          <Text style={styles.weekDayText}>{day}</Text>
        </View>
      ))}
    </View>
  );

  const renderCalendarDates = () => (
    <View style={styles.datesContainer}>
      {calendarDays.map((day, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dateCell,
            day.date === selectedDate && styles.selectedDateCell,
          ]}
          onPress={() => handleDateSelect(day.date)}
        >
          <Text
            style={[
              styles.dateText,
              day.date === selectedDate && styles.selectedDateText,
            ]}
          >
            {day.date}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDaySchedule = () => {
    const selectedDay = calendarDays.find(day => day.date === selectedDate);
    
    return (
      <ScrollView style={styles.scheduleContainer}>
        {selectedDay && (
          <View style={styles.daySchedule}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayNumber}>{selectedDay.date}</Text>
              <Text style={styles.dayName}>{selectedDay.dayOfWeek}</Text>
            </View>
            {selectedDay.shifts.length === 0 ? (
              <View style={styles.noJobsContainer}>
                <Text style={styles.noJobsText}>No Jobs!</Text>
              </View>
            ) : (
              selectedDay.shifts.map((shift: any) => (
                <TouchableOpacity
                  key={shift.id}
                  style={styles.shiftCard}
                  onPress={() => router.push(`/shift/${shift.id}`)}
                >
                  <Text style={styles.shiftTitle}>{shift.title}</Text>
                  <Text style={styles.shiftTime}>
                    {new Date(shift.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(shift.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {shift.location && <Text style={styles.shiftLocation}>{shift.location}</Text>}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderCalendarHeader()}
      {renderWeekDays()}
      {renderCalendarDates()}
      {renderDaySchedule()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  refreshButton: {
    padding: 8,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekDayCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dateCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  selectedDateCell: {
    backgroundColor: '#5B8DBE',
    borderRadius: 50,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedDateText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  daySchedule: {
    padding: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  dayNumber: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.text,
    marginRight: 8,
  },
  dayName: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  noJobsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  noJobsText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  shiftLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
