
/**
 * Supabase Integration Examples
 * 
 * This file demonstrates how to use Supabase with the existing database schema.
 * Replace the existing API calls in your components with these Supabase calls.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your project URL and anon key from Settings > API
 * 3. Update app.json with your Supabase credentials:
 *    - supabaseUrl: "https://<YOUR_PROJECT_ID>.supabase.co"
 *    - supabaseAnonKey: "<YOUR_SUPABASE_ANON_KEY>"
 * 4. Create the database tables in Supabase (see schema below)
 * 5. Replace API calls in your components with these examples
 */

import {
  supabaseSelect,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
  supabaseUploadFile,
  supabaseGetPublicUrl,
  setBearerToken,
  clearBearerToken,
} from "./supabase";

/**
 * ============================================================================
 * AUTHENTICATION EXAMPLES
 * ============================================================================
 */

/**
 * Sign in with email and password
 * After successful login, store the JWT token
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    // Call your auth endpoint (Better Auth or Supabase Auth)
    // This example assumes you're using Better Auth
    const response = await fetch(`${BACKEND_URL}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.token) {
      // Store the JWT token for Supabase requests
      await setBearerToken(data.token);
    }

    return data;
  } catch (error) {
    console.error("[Auth] Sign in failed:", error);
    throw error;
  }
};

/**
 * Sign out and clear token
 */
export const signOut = async () => {
  try {
    await clearBearerToken();
    console.log("[Auth] Signed out successfully");
  } catch (error) {
    console.error("[Auth] Sign out failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * USER OPERATIONS
 * ============================================================================
 */

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  try {
    const users = await supabaseSelect("user", "*", {
      id: "eq.current_user_id", // Replace with actual user ID
    });
    return users[0];
  } catch (error) {
    console.error("[User] Get current user failed:", error);
    throw error;
  }
};

/**
 * Get user roles
 */
export const getUserRoles = async (userId: string) => {
  try {
    const roles = await supabaseSelect("user_roles", "*", {
      user_id: `eq.${userId}`,
    });
    return roles;
  } catch (error) {
    console.error("[User] Get roles failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * SHIFT OPERATIONS
 * ============================================================================
 */

/**
 * Get all shifts for a support worker
 */
export const getWorkerShifts = async (workerId: string) => {
  try {
    const shifts = await supabaseSelect("shifts", "*", {
      support_worker_id: `eq.${workerId}`,
    });
    return shifts;
  } catch (error) {
    console.error("[Shifts] Get worker shifts failed:", error);
    throw error;
  }
};

/**
 * Get shifts by date range
 */
export const getShiftsByDateRange = async (
  workerId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const shifts = await supabaseSelect("shifts", "*", {
      support_worker_id: `eq.${workerId}`,
      start_time: `gte.${startDate}`,
      end_time: `lte.${endDate}`,
    });
    return shifts;
  } catch (error) {
    console.error("[Shifts] Get shifts by date failed:", error);
    throw error;
  }
};

/**
 * Create a new shift
 */
export const createShift = async (shiftData: {
  support_worker_id: string;
  service_provider_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  status: string;
  hourly_rate?: number;
}) => {
  try {
    const shift = await supabaseInsert("shifts", shiftData);
    return shift;
  } catch (error) {
    console.error("[Shifts] Create shift failed:", error);
    throw error;
  }
};

/**
 * Update shift status
 */
export const updateShiftStatus = async (shiftId: string, status: string) => {
  try {
    const shift = await supabaseUpdate(
      "shifts",
      { status, updated_at: new Date().toISOString() },
      { id: `eq.${shiftId}` }
    );
    return shift;
  } catch (error) {
    console.error("[Shifts] Update shift status failed:", error);
    throw error;
  }
};

/**
 * Delete a shift
 */
export const deleteShift = async (shiftId: string) => {
  try {
    await supabaseDelete("shifts", { id: `eq.${shiftId}` });
    console.log("[Shifts] Shift deleted successfully");
  } catch (error) {
    console.error("[Shifts] Delete shift failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * TIMESHEET OPERATIONS
 * ============================================================================
 */

/**
 * Get timesheets for a support worker
 */
export const getWorkerTimesheets = async (workerId: string) => {
  try {
    const timesheets = await supabaseSelect("timesheets", "*", {
      support_worker_id: `eq.${workerId}`,
    });
    return timesheets;
  } catch (error) {
    console.error("[Timesheets] Get worker timesheets failed:", error);
    throw error;
  }
};

/**
 * Clock in (create timesheet)
 */
export const clockIn = async (shiftId: string, workerId: string) => {
  try {
    const timesheet = await supabaseInsert("timesheets", {
      shift_id: shiftId,
      support_worker_id: workerId,
      start_time: new Date().toISOString(),
      status: "in_progress",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return timesheet;
  } catch (error) {
    console.error("[Timesheets] Clock in failed:", error);
    throw error;
  }
};

/**
 * Clock out (update timesheet)
 */
export const clockOut = async (
  timesheetId: string,
  breakMinutes?: number,
  notes?: string
) => {
  try {
    const endTime = new Date();
    const timesheet = await supabaseUpdate(
      "timesheets",
      {
        end_time: endTime.toISOString(),
        break_minutes: breakMinutes || 0,
        notes,
        status: "completed",
        updated_at: endTime.toISOString(),
      },
      { id: `eq.${timesheetId}` }
    );
    return timesheet;
  } catch (error) {
    console.error("[Timesheets] Clock out failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * COMPLIANCE DOCUMENTS OPERATIONS
 * ============================================================================
 */

/**
 * Get compliance documents for a support worker
 */
export const getWorkerDocuments = async (workerId: string) => {
  try {
    const documents = await supabaseSelect("compliance_documents", "*", {
      support_worker_id: `eq.${workerId}`,
    });
    return documents;
  } catch (error) {
    console.error("[Documents] Get worker documents failed:", error);
    throw error;
  }
};

/**
 * Upload a compliance document
 */
export const uploadComplianceDocument = async (
  workerId: string,
  providerId: string,
  file: File | Blob,
  documentName: string,
  documentType: string,
  expiryDate?: string
) => {
  try {
    // 1. Upload file to Supabase storage
    const fileName = `${workerId}/${Date.now()}_${documentName}`;
    const { url, path } = await supabaseUploadFile(
      "compliance-documents",
      fileName,
      file,
      file.type
    );

    // 2. Create document record in database
    const document = await supabaseInsert("compliance_documents", {
      support_worker_id: workerId,
      service_provider_id: providerId,
      document_name: documentName,
      document_type: documentType,
      storage_key: path,
      expiry_date: expiryDate || null,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { ...document, url };
  } catch (error) {
    console.error("[Documents] Upload document failed:", error);
    throw error;
  }
};

/**
 * Delete a compliance document
 */
export const deleteComplianceDocument = async (documentId: string) => {
  try {
    await supabaseDelete("compliance_documents", { id: `eq.${documentId}` });
    console.log("[Documents] Document deleted successfully");
  } catch (error) {
    console.error("[Documents] Delete document failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * PAYSLIP OPERATIONS
 * ============================================================================
 */

/**
 * Get payslips for a support worker
 */
export const getWorkerPayslips = async (workerId: string) => {
  try {
    const payslips = await supabaseSelect("payslips", "*", {
      support_worker_id: `eq.${workerId}`,
    });
    return payslips;
  } catch (error) {
    console.error("[Payslips] Get worker payslips failed:", error);
    throw error;
  }
};

/**
 * Create a payslip
 */
export const createPayslip = async (payslipData: {
  support_worker_id: string;
  service_provider_id: string;
  pay_period_start_date: string;
  pay_period_end_date: string;
  total_hours: number;
  hourly_rate: number;
  gross_pay: number;
  deductions?: number;
  net_pay: number;
  notes?: string;
  status: string;
}) => {
  try {
    const payslip = await supabaseInsert("payslips", {
      ...payslipData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return payslip;
  } catch (error) {
    console.error("[Payslips] Create payslip failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * SERVICE PROVIDER OPERATIONS
 * ============================================================================
 */

/**
 * Get service provider profile
 */
export const getServiceProvider = async (userId: string) => {
  try {
    const providers = await supabaseSelect("service_providers", "*", {
      user_id: `eq.${userId}`,
    });
    return providers[0];
  } catch (error) {
    console.error("[Provider] Get service provider failed:", error);
    throw error;
  }
};

/**
 * Create service provider profile
 */
export const createServiceProvider = async (providerData: {
  user_id: string;
  company_name: string;
  company_abn?: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  website?: string;
}) => {
  try {
    const provider = await supabaseInsert("service_providers", {
      ...providerData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return provider;
  } catch (error) {
    console.error("[Provider] Create service provider failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * SUPPORT WORKER OPERATIONS
 * ============================================================================
 */

/**
 * Get support worker profile
 */
export const getSupportWorker = async (userId: string) => {
  try {
    const workers = await supabaseSelect("support_workers", "*", {
      user_id: `eq.${userId}`,
    });
    return workers[0];
  } catch (error) {
    console.error("[Worker] Get support worker failed:", error);
    throw error;
  }
};

/**
 * Create support worker profile
 */
export const createSupportWorker = async (workerData: {
  user_id: string;
  date_of_birth?: string;
  phone_number?: string;
  address?: string;
}) => {
  try {
    const worker = await supabaseInsert("support_workers", {
      ...workerData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return worker;
  } catch (error) {
    console.error("[Worker] Create support worker failed:", error);
    throw error;
  }
};

/**
 * Get all support workers for a service provider
 */
export const getProviderWorkers = async (providerId: string) => {
  try {
    // Get worker-provider relationships
    const relationships = await supabaseSelect(
      "worker_provider_relationships",
      "*",
      {
        service_provider_id: `eq.${providerId}`,
        status: "eq.active",
      }
    );

    // Get worker details for each relationship
    const workerIds = relationships.map((rel: any) => rel.support_worker_id);
    const workers = await supabaseSelect("support_workers", "*", {
      user_id: `in.(${workerIds.join(",")})`,
    });

    return workers;
  } catch (error) {
    console.error("[Worker] Get provider workers failed:", error);
    throw error;
  }
};

/**
 * ============================================================================
 * SHIFT NOTES OPERATIONS
 * ============================================================================
 */

/**
 * Get shift notes
 */
export const getShiftNotes = async (shiftId: string) => {
  try {
    const notes = await supabaseSelect("shift_notes", "*", {
      shift_id: `eq.${shiftId}`,
    });
    return notes[0];
  } catch (error) {
    console.error("[Notes] Get shift notes failed:", error);
    throw error;
  }
};

/**
 * Create or update shift notes
 */
export const saveShiftNotes = async (
  shiftId: string,
  notesData: {
    client_name?: string;
    client_id?: string;
    task_description?: string;
    notes?: string;
    special_requirements?: string;
  }
) => {
  try {
    // Check if notes already exist
    const existingNotes = await getShiftNotes(shiftId);

    if (existingNotes) {
      // Update existing notes
      const updated = await supabaseUpdate(
        "shift_notes",
        {
          ...notesData,
          updated_at: new Date().toISOString(),
        },
        { shift_id: `eq.${shiftId}` }
      );
      return updated;
    } else {
      // Create new notes
      const created = await supabaseInsert("shift_notes", {
        shift_id: shiftId,
        ...notesData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return created;
    }
  } catch (error) {
    console.error("[Notes] Save shift notes failed:", error);
    throw error;
  }
};
