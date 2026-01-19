
/**
 * Supabase Quick Reference Guide
 * 
 * This file provides quick examples and patterns for using Supabase in the app.
 * All Supabase operations are authenticated using the bearer token from Better Auth.
 */

import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getShiftWorkers,
  getShiftWorkerById,
  createShiftWorker,
  updateShiftWorker,
  getServiceProviders,
  getServiceProviderById,
  createServiceProvider,
  updateServiceProvider,
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getTimesheets,
  createTimesheet,
  updateTimesheet,
  getTimesheetEntries,
  createTimesheetEntry,
  getMyDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getReports,
  createReport,
  createSpeechToTextLog,
  getSpeechToTextLogs,
  createMapSearchHistory,
  getMapSearchHistory,
  registerNotificationDevice,
  getNotificationDevices,
  updateNotificationDevice,
} from './supabaseHelpers';

/**
 * CLIENTS
 * 
 * Manage client information including contact details, addresses, and tasks.
 * The 'tasks' field stores medication instructions and support tasks.
 */

// Get all clients for a service provider
export async function exampleGetClients(serviceProviderId: string) {
  const clients = await getClients(serviceProviderId);
  console.log('Clients:', clients);
  return clients;
}

// Get a specific client by ID
export async function exampleGetClient(clientId: string) {
  const client = await getClientById(clientId);
  console.log('Client:', client);
  return client;
}

// Create a new client with tasks field
export async function exampleCreateClient(serviceProviderId: string) {
  const newClient = await createClient({
    name: 'John Doe',
    address: '123 Main St, Sydney NSW 2000',
    phone: '0412345678',
    email: 'john@example.com',
    notes: 'Prefers morning shifts',
    tasks: 'Medication: Take 2 tablets at 8am. Support: Assist with mobility exercises.',
    latitude: -33.8688,
    longitude: 151.2093,
    service_provider_id: serviceProviderId,
  });
  console.log('Created client:', newClient);
  return newClient;
}

// Update a client's tasks
export async function exampleUpdateClientTasks(clientId: string) {
  const updated = await updateClient(clientId, {
    tasks: 'Updated medication schedule: 1 tablet at 9am, 1 tablet at 9pm. Support: Daily walking assistance.',
  });
  console.log('Updated client:', updated);
  return updated;
}

// Delete a client
export async function exampleDeleteClient(clientId: string) {
  await deleteClient(clientId);
  console.log('Client deleted');
}

/**
 * SHIFTS
 * 
 * Manage shift scheduling and assignments.
 */

// Get all shifts for a worker
export async function exampleGetWorkerShifts(workerId: string) {
  const shifts = await getShifts({ workerId });
  console.log('Worker shifts:', shifts);
  return shifts;
}

// Get all shifts for a client
export async function exampleGetClientShifts(clientId: string) {
  const shifts = await getShifts({ clientId });
  console.log('Client shifts:', shifts);
  return shifts;
}

// Create a new shift
export async function exampleCreateShift(serviceProviderId: string, clientId: string, workerId: string) {
  const newShift = await createShift({
    title: 'Morning Care Shift',
    description: 'Assist with morning routine and medication',
    start_time: new Date('2026-01-15T08:00:00').toISOString(),
    end_time: new Date('2026-01-15T12:00:00').toISOString(),
    status: 'scheduled',
    location: '123 Main St, Sydney NSW 2000',
    client_id: clientId,
    worker_id: workerId,
    service_provider_id: serviceProviderId,
  });
  console.log('Created shift:', newShift);
  return newShift;
}

// Update shift status
export async function exampleUpdateShiftStatus(shiftId: string) {
  const updated = await updateShift(shiftId, {
    status: 'completed',
  });
  console.log('Updated shift:', updated);
  return updated;
}

/**
 * TIMESHEETS
 * 
 * Track clock-in/clock-out times and hours worked.
 */

// Get timesheets for a worker
export async function exampleGetWorkerTimesheets(workerId: string) {
  const timesheets = await getTimesheets({ workerId });
  console.log('Worker timesheets:', timesheets);
  return timesheets;
}

// Create a timesheet (clock in)
export async function exampleClockIn(shiftId: string, workerId: string) {
  const timesheet = await createTimesheet({
    shift_id: shiftId,
    worker_id: workerId,
    clock_in: new Date().toISOString(),
    status: 'pending',
  });
  console.log('Clocked in:', timesheet);
  return timesheet;
}

// Update timesheet (clock out)
export async function exampleClockOut(timesheetId: string) {
  const clockOutTime = new Date();
  const updated = await updateTimesheet(timesheetId, {
    clock_out: clockOutTime.toISOString(),
    status: 'pending',
  });
  console.log('Clocked out:', updated);
  return updated;
}

// Add a timesheet entry (note)
export async function exampleAddTimesheetNote(timesheetId: string) {
  const entry = await createTimesheetEntry({
    timesheet_id: timesheetId,
    entry_type: 'note',
    content: 'Client was in good spirits today. Completed all scheduled activities.',
  });
  console.log('Added note:', entry);
  return entry;
}

/**
 * DOCUMENTS
 * 
 * Manage compliance documents and certifications.
 */

// Get all documents for a user
export async function exampleGetUserDocuments(userId: string) {
  const documents = await getMyDocuments(userId);
  console.log('User documents:', documents);
  return documents;
}

// Create a document record
export async function exampleCreateDocument(userId: string, fileUrl: string) {
  const document = await createDocument({
    user_id: userId,
    document_type: 'first_aid',
    file_name: 'First Aid Certificate.pdf',
    file_url: fileUrl,
    expiry_date: new Date('2027-01-15').toISOString(),
    status: 'active',
  });
  console.log('Created document:', document);
  return document;
}

// Update document status
export async function exampleUpdateDocumentStatus(documentId: string) {
  const updated = await updateDocument(documentId, {
    status: 'expiring_soon',
  });
  console.log('Updated document:', updated);
  return updated;
}

/**
 * SPEECH-TO-TEXT
 * 
 * Log speech-to-text transcriptions for audit trail.
 */

// Log a speech-to-text transcription
export async function exampleLogSpeechToText(userId: string, transcription: string) {
  const log = await createSpeechToTextLog({
    user_id: userId,
    transcription,
    duration_seconds: 15,
  });
  console.log('Logged transcription:', log);
  return log;
}

// Get speech-to-text history
export async function exampleGetSpeechToTextHistory(userId: string) {
  const logs = await getSpeechToTextLogs(userId);
  console.log('Speech-to-text history:', logs);
  return logs;
}

/**
 * MAP SEARCH HISTORY
 * 
 * Track address searches for analytics and quick access.
 */

// Log a map search
export async function exampleLogMapSearch(userId: string, address: string, lat: number, lng: number) {
  const search = await createMapSearchHistory({
    user_id: userId,
    search_query: address,
    selected_address: address,
    latitude: lat,
    longitude: lng,
  });
  console.log('Logged map search:', search);
  return search;
}

// Get map search history
export async function exampleGetMapSearchHistory(userId: string) {
  const history = await getMapSearchHistory(userId);
  console.log('Map search history:', history);
  return history;
}

/**
 * PUSH NOTIFICATIONS
 * 
 * Register devices for push notifications.
 */

// Register a device for push notifications
export async function exampleRegisterDevice(userId: string, expoPushToken: string) {
  const device = await registerNotificationDevice({
    user_id: userId,
    expo_push_token: expoPushToken,
    platform: 'ios',
    is_active: true,
  });
  console.log('Registered device:', device);
  return device;
}

// Get all devices for a user
export async function exampleGetUserDevices(userId: string) {
  const devices = await getNotificationDevices(userId);
  console.log('User devices:', devices);
  return devices;
}

// Deactivate a device
export async function exampleDeactivateDevice(deviceId: string) {
  const updated = await updateNotificationDevice(deviceId, {
    is_active: false,
  });
  console.log('Deactivated device:', updated);
  return updated;
}

/**
 * REPORTS
 * 
 * Generate and store reports.
 */

// Create a report
export async function exampleCreateReport(serviceProviderId: string) {
  const report = await createReport({
    report_type: 'shift_summary',
    title: 'Monthly Shift Summary - January 2026',
    content: 'Total shifts: 150, Total hours: 600, Average rating: 4.8',
    generated_by: serviceProviderId,
    service_provider_id: serviceProviderId,
    start_date: new Date('2026-01-01').toISOString(),
    end_date: new Date('2026-01-31').toISOString(),
  });
  console.log('Created report:', report);
  return report;
}

// Get reports for a service provider
export async function exampleGetServiceProviderReports(serviceProviderId: string) {
  const reports = await getReports({ serviceProviderId });
  console.log('Service provider reports:', reports);
  return reports;
}

/**
 * COMMON PATTERNS
 */

// Pattern 1: Load data on screen mount
export async function patternLoadDataOnMount(userId: string) {
  try {
    const [clients, shifts, documents] = await Promise.all([
      getClients(userId),
      getShifts({ serviceProviderId: userId }),
      getMyDocuments(userId),
    ]);
    
    console.log('Loaded all data:', { clients, shifts, documents });
    return { clients, shifts, documents };
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Pattern 2: Create with related data
export async function patternCreateShiftWithClient(serviceProviderId: string) {
  try {
    // First create the client
    const client = await createClient({
      name: 'Jane Smith',
      address: '456 Park Ave, Melbourne VIC 3000',
      phone: '0498765432',
      service_provider_id: serviceProviderId,
    });
    
    // Then create a shift for that client
    const shift = await createShift({
      title: 'Evening Care',
      start_time: new Date('2026-01-16T18:00:00').toISOString(),
      end_time: new Date('2026-01-16T22:00:00').toISOString(),
      status: 'scheduled',
      client_id: client.id,
      service_provider_id: serviceProviderId,
    });
    
    console.log('Created client and shift:', { client, shift });
    return { client, shift };
  } catch (error) {
    console.error('Error creating related data:', error);
    throw error;
  }
}

// Pattern 3: Update with optimistic UI
export async function patternOptimisticUpdate(clientId: string, newTasks: string) {
  try {
    // Update UI immediately (optimistic)
    console.log('Updating UI optimistically...');
    
    // Then update in Supabase
    const updated = await updateClient(clientId, { tasks: newTasks });
    
    console.log('Confirmed update:', updated);
    return updated;
  } catch (error) {
    console.error('Error updating, reverting UI:', error);
    // Revert UI changes here
    throw error;
  }
}

// Pattern 4: Batch operations
export async function patternBatchCreate(serviceProviderId: string) {
  try {
    const clientsToCreate = [
      { name: 'Client 1', address: 'Address 1', service_provider_id: serviceProviderId },
      { name: 'Client 2', address: 'Address 2', service_provider_id: serviceProviderId },
      { name: 'Client 3', address: 'Address 3', service_provider_id: serviceProviderId },
    ];
    
    const createdClients = await Promise.all(
      clientsToCreate.map(client => createClient(client))
    );
    
    console.log('Created multiple clients:', createdClients);
    return createdClients;
  } catch (error) {
    console.error('Error in batch create:', error);
    throw error;
  }
}

/**
 * ERROR HANDLING
 */

// Always wrap Supabase calls in try-catch
export async function patternErrorHandling(clientId: string) {
  try {
    const client = await getClientById(clientId);
    return client;
  } catch (error) {
    console.error('Error fetching client:', error);
    
    // Check error type
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error('Authentication error - user needs to log in');
      } else if (error.message.includes('404')) {
        console.error('Client not found');
      } else {
        console.error('Unknown error:', error.message);
      }
    }
    
    throw error;
  }
}
