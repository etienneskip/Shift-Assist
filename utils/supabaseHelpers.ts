
/**
 * Supabase Helper Functions
 * 
 * Table-specific helper functions for all Supabase tables in the app.
 * Provides type-safe, easy-to-use functions for common operations.
 */

import {
  supabaseSelect,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
  supabaseUploadFile,
  getBearerToken,
} from './supabase';

/**
 * Type Definitions
 */

export interface Client {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  notes?: string;
  tasks?: string;
  latitude?: number;
  longitude?: number;
  service_provider_id: string;
  created_at: string;
  updated_at?: string;
}

export interface ShiftWorker {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  service_provider_id: string;
  created_at: string;
  updated_at?: string;
}

export interface ServiceProvider {
  id: string;
  user_id: string;
  company_name: string;
  abn?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SupportWorkerServiceProvider {
  id: string;
  support_worker_id: string;
  service_provider_id: string;
  created_at: string;
}

export interface Shift {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  client_id: string;
  worker_id?: string;
  service_provider_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Timesheet {
  id: string;
  shift_id: string;
  worker_id: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  entry_type: 'note' | 'medication' | 'incident' | 'general';
  content: string;
  voice_note_url?: string;
  created_at: string;
}

export interface MyDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  expiry_date?: string;
  status: 'active' | 'expired' | 'expiring_soon';
  created_at: string;
  updated_at?: string;
}

export interface Report {
  id: string;
  report_type: string;
  title: string;
  content: string;
  generated_by: string;
  service_provider_id?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface SpeechToTextLog {
  id: string;
  user_id: string;
  audio_url?: string;
  transcription: string;
  duration_seconds?: number;
  created_at: string;
}

export interface MapSearchHistory {
  id: string;
  user_id: string;
  search_query: string;
  selected_address?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface NotificationDevice {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android' | 'web';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * CLIENTS
 */

export const getClients = async (serviceProviderId?: string): Promise<Client[]> => {
  console.log('[Supabase] Fetching clients for service provider:', serviceProviderId);
  
  const filters = serviceProviderId
    ? { 'service_provider_id': `eq.${serviceProviderId}` }
    : undefined;
  
  return supabaseSelect<Client>('clients', '*', filters);
};

export const getClientById = async (clientId: string): Promise<Client | null> => {
  console.log('[Supabase] Fetching client:', clientId);
  const results = await supabaseSelect<Client>('clients', '*', {
    'id': `eq.${clientId}`,
  });
  return results[0] || null;
};

export const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> => {
  console.log('[Supabase] Creating client:', clientData);
  return supabaseInsert<Client>('clients', clientData);
};

export const updateClient = async (clientId: string, updates: Partial<Client>): Promise<Client> => {
  console.log('[Supabase] Updating client:', clientId, updates);
  return supabaseUpdate<Client>('clients', updates, { 'id': `eq.${clientId}` });
};

export const deleteClient = async (clientId: string): Promise<void> => {
  console.log('[Supabase] Deleting client:', clientId);
  return supabaseDelete('clients', { 'id': `eq.${clientId}` });
};

/**
 * SHIFT WORKERS
 */

export const getShiftWorkers = async (serviceProviderId?: string): Promise<ShiftWorker[]> => {
  console.log('[Supabase] Fetching shift workers for service provider:', serviceProviderId);
  
  const filters = serviceProviderId
    ? { 'service_provider_id': `eq.${serviceProviderId}` }
    : undefined;
  
  return supabaseSelect<ShiftWorker>('shift_workers', '*', filters);
};

export const getShiftWorkerById = async (workerId: string): Promise<ShiftWorker | null> => {
  console.log('[Supabase] Fetching shift worker:', workerId);
  const results = await supabaseSelect<ShiftWorker>('shift_workers', '*', {
    'id': `eq.${workerId}`,
  });
  return results[0] || null;
};

export const createShiftWorker = async (workerData: Omit<ShiftWorker, 'id' | 'created_at' | 'updated_at'>): Promise<ShiftWorker> => {
  console.log('[Supabase] Creating shift worker:', workerData);
  return supabaseInsert<ShiftWorker>('shift_workers', workerData);
};

export const updateShiftWorker = async (workerId: string, updates: Partial<ShiftWorker>): Promise<ShiftWorker> => {
  console.log('[Supabase] Updating shift worker:', workerId, updates);
  return supabaseUpdate<ShiftWorker>('shift_workers', updates, { 'id': `eq.${workerId}` });
};

/**
 * SERVICE PROVIDERS
 */

export const getServiceProviders = async (): Promise<ServiceProvider[]> => {
  console.log('[Supabase] Fetching service providers');
  return supabaseSelect<ServiceProvider>('service_providers', '*');
};

export const getServiceProviderById = async (providerId: string): Promise<ServiceProvider | null> => {
  console.log('[Supabase] Fetching service provider:', providerId);
  const results = await supabaseSelect<ServiceProvider>('service_providers', '*', {
    'id': `eq.${providerId}`,
  });
  return results[0] || null;
};

export const getServiceProviderByUserId = async (userId: string): Promise<ServiceProvider | null> => {
  console.log('[Supabase] Fetching service provider by user_id:', userId);
  const results = await supabaseSelect<ServiceProvider>('service_providers', '*', {
    'user_id': `eq.${userId}`,
  });
  return results[0] || null;
};

export const createServiceProvider = async (providerData: Omit<ServiceProvider, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceProvider> => {
  console.log('[Supabase] Creating service provider:', providerData);
  return supabaseInsert<ServiceProvider>('service_providers', providerData);
};

export const updateServiceProvider = async (providerId: string, updates: Partial<ServiceProvider>): Promise<ServiceProvider> => {
  console.log('[Supabase] Updating service provider:', providerId, updates);
  
  // Ensure we're returning a single object, not an array
  const result = await supabaseUpdate<ServiceProvider>('service_providers', updates, { 'id': `eq.${providerId}` });
  
  // supabaseUpdate returns the updated record
  return result;
};

/**
 * SUPPORT WORKER SERVICE PROVIDERS (Join Table)
 */

export const getSupportWorkerProviders = async (supportWorkerId: string): Promise<SupportWorkerServiceProvider[]> => {
  console.log('[Supabase] Fetching service providers for support worker:', supportWorkerId);
  return supabaseSelect<SupportWorkerServiceProvider>('support_worker_service_providers', '*', {
    'support_worker_id': `eq.${supportWorkerId}`,
  });
};

export const linkSupportWorkerToProvider = async (
  supportWorkerId: string,
  serviceProviderId: string
): Promise<SupportWorkerServiceProvider> => {
  console.log('[Supabase] Linking support worker to provider:', { supportWorkerId, serviceProviderId });
  return supabaseInsert<SupportWorkerServiceProvider>('support_worker_service_providers', {
    support_worker_id: supportWorkerId,
    service_provider_id: serviceProviderId,
  });
};

export const unlinkSupportWorkerFromProvider = async (
  supportWorkerId: string,
  serviceProviderId: string
): Promise<void> => {
  console.log('[Supabase] Unlinking support worker from provider:', { supportWorkerId, serviceProviderId });
  return supabaseDelete('support_worker_service_providers', {
    'support_worker_id': `eq.${supportWorkerId}`,
    'service_provider_id': `eq.${serviceProviderId}`,
  });
};

/**
 * SHIFTS
 */

export const getShifts = async (filters?: {
  workerId?: string;
  clientId?: string;
  serviceProviderId?: string;
  status?: string;
}): Promise<Shift[]> => {
  console.log('[Supabase] Fetching shifts with filters:', filters);
  
  const supabaseFilters: Record<string, string> = {};
  if (filters?.workerId) supabaseFilters['worker_id'] = `eq.${filters.workerId}`;
  if (filters?.clientId) supabaseFilters['client_id'] = `eq.${filters.clientId}`;
  if (filters?.serviceProviderId) supabaseFilters['service_provider_id'] = `eq.${filters.serviceProviderId}`;
  if (filters?.status) supabaseFilters['status'] = `eq.${filters.status}`;
  
  return supabaseSelect<Shift>('shifts', '*', Object.keys(supabaseFilters).length > 0 ? supabaseFilters : undefined);
};

export const getShiftById = async (shiftId: string): Promise<Shift | null> => {
  console.log('[Supabase] Fetching shift:', shiftId);
  const results = await supabaseSelect<Shift>('shifts', '*', {
    'id': `eq.${shiftId}`,
  });
  return results[0] || null;
};

export const createShift = async (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>): Promise<Shift> => {
  console.log('[Supabase] Creating shift:', shiftData);
  return supabaseInsert<Shift>('shifts', shiftData);
};

export const updateShift = async (shiftId: string, updates: Partial<Shift>): Promise<Shift> => {
  console.log('[Supabase] Updating shift:', shiftId, updates);
  return supabaseUpdate<Shift>('shifts', updates, { 'id': `eq.${shiftId}` });
};

export const deleteShift = async (shiftId: string): Promise<void> => {
  console.log('[Supabase] Deleting shift:', shiftId);
  return supabaseDelete('shifts', { 'id': `eq.${shiftId}` });
};

/**
 * TIMESHEETS
 */

export const getTimesheets = async (filters?: {
  workerId?: string;
  shiftId?: string;
  status?: string;
}): Promise<Timesheet[]> => {
  console.log('[Supabase] Fetching timesheets with filters:', filters);
  
  const supabaseFilters: Record<string, string> = {};
  if (filters?.workerId) supabaseFilters['worker_id'] = `eq.${filters.workerId}`;
  if (filters?.shiftId) supabaseFilters['shift_id'] = `eq.${filters.shiftId}`;
  if (filters?.status) supabaseFilters['status'] = `eq.${filters.status}`;
  
  return supabaseSelect<Timesheet>('timesheets', '*', Object.keys(supabaseFilters).length > 0 ? supabaseFilters : undefined);
};

export const createTimesheet = async (timesheetData: Omit<Timesheet, 'id' | 'created_at' | 'updated_at'>): Promise<Timesheet> => {
  console.log('[Supabase] Creating timesheet:', timesheetData);
  return supabaseInsert<Timesheet>('timesheets', timesheetData);
};

export const updateTimesheet = async (timesheetId: string, updates: Partial<Timesheet>): Promise<Timesheet> => {
  console.log('[Supabase] Updating timesheet:', timesheetId, updates);
  return supabaseUpdate<Timesheet>('timesheets', updates, { 'id': `eq.${timesheetId}` });
};

/**
 * TIMESHEET ENTRIES
 */

export const getTimesheetEntries = async (timesheetId: string): Promise<TimesheetEntry[]> => {
  console.log('[Supabase] Fetching timesheet entries for:', timesheetId);
  return supabaseSelect<TimesheetEntry>('timesheet_entries', '*', {
    'timesheet_id': `eq.${timesheetId}`,
  });
};

export const createTimesheetEntry = async (entryData: Omit<TimesheetEntry, 'id' | 'created_at'>): Promise<TimesheetEntry> => {
  console.log('[Supabase] Creating timesheet entry:', entryData);
  return supabaseInsert<TimesheetEntry>('timesheet_entries', entryData);
};

/**
 * DOCUMENTS
 */

export const getMyDocuments = async (userId: string): Promise<MyDocument[]> => {
  console.log('[Supabase] Fetching documents for user:', userId);
  return supabaseSelect<MyDocument>('my_documents', '*', {
    'user_id': `eq.${userId}`,
  });
};

export const createDocument = async (documentData: Omit<MyDocument, 'id' | 'created_at' | 'updated_at'>): Promise<MyDocument> => {
  console.log('[Supabase] Creating document:', documentData);
  return supabaseInsert<MyDocument>('my_documents', documentData);
};

export const updateDocument = async (documentId: string, updates: Partial<MyDocument>): Promise<MyDocument> => {
  console.log('[Supabase] Updating document:', documentId, updates);
  return supabaseUpdate<MyDocument>('my_documents', updates, { 'id': `eq.${documentId}` });
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  console.log('[Supabase] Deleting document:', documentId);
  return supabaseDelete('my_documents', { 'id': `eq.${documentId}` });
};

/**
 * REPORTS
 */

export const getReports = async (filters?: {
  serviceProviderId?: string;
  reportType?: string;
}): Promise<Report[]> => {
  console.log('[Supabase] Fetching reports with filters:', filters);
  
  const supabaseFilters: Record<string, string> = {};
  if (filters?.serviceProviderId) supabaseFilters['service_provider_id'] = `eq.${filters.serviceProviderId}`;
  if (filters?.reportType) supabaseFilters['report_type'] = `eq.${filters.reportType}`;
  
  return supabaseSelect<Report>('reports', '*', Object.keys(supabaseFilters).length > 0 ? supabaseFilters : undefined);
};

export const createReport = async (reportData: Omit<Report, 'id' | 'created_at'>): Promise<Report> => {
  console.log('[Supabase] Creating report:', reportData);
  return supabaseInsert<Report>('reports', reportData);
};

/**
 * SPEECH TO TEXT LOGS
 */

export const createSpeechToTextLog = async (logData: Omit<SpeechToTextLog, 'id' | 'created_at'>): Promise<SpeechToTextLog> => {
  console.log('[Supabase] Creating speech-to-text log:', logData);
  return supabaseInsert<SpeechToTextLog>('speech_to_text_logs', logData);
};

export const getSpeechToTextLogs = async (userId: string): Promise<SpeechToTextLog[]> => {
  console.log('[Supabase] Fetching speech-to-text logs for user:', userId);
  return supabaseSelect<SpeechToTextLog>('speech_to_text_logs', '*', {
    'user_id': `eq.${userId}`,
  });
};

/**
 * MAP SEARCH HISTORY
 */

export const createMapSearchHistory = async (searchData: Omit<MapSearchHistory, 'id' | 'created_at'>): Promise<MapSearchHistory> => {
  console.log('[Supabase] Creating map search history:', searchData);
  return supabaseInsert<MapSearchHistory>('map_search_history', searchData);
};

export const getMapSearchHistory = async (userId: string): Promise<MapSearchHistory[]> => {
  console.log('[Supabase] Fetching map search history for user:', userId);
  return supabaseSelect<MapSearchHistory>('map_search_history', '*', {
    'user_id': `eq.${userId}`,
  });
};

/**
 * NOTIFICATION DEVICES
 */

export const registerNotificationDevice = async (deviceData: Omit<NotificationDevice, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationDevice> => {
  console.log('[Supabase] Registering notification device:', deviceData);
  return supabaseInsert<NotificationDevice>('notification_devices', deviceData);
};

export const getNotificationDevices = async (userId: string): Promise<NotificationDevice[]> => {
  console.log('[Supabase] Fetching notification devices for user:', userId);
  return supabaseSelect<NotificationDevice>('notification_devices', '*', {
    'user_id': `eq.${userId}`,
  });
};

export const updateNotificationDevice = async (deviceId: string, updates: Partial<NotificationDevice>): Promise<NotificationDevice> => {
  console.log('[Supabase] Updating notification device:', deviceId, updates);
  return supabaseUpdate<NotificationDevice>('notification_devices', updates, { 'id': `eq.${deviceId}` });
};
