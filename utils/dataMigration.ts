
/**
 * Data Migration Utilities
 * 
 * Helper functions to migrate data from current backend to Supabase.
 * Use these functions to transfer existing data to your new Supabase database.
 * 
 * IMPORTANT: Run these migrations carefully and test with a small dataset first.
 */

import { authenticatedGet } from './api';
import { supabaseInsert } from './supabase';

/**
 * Migration status tracking
 */
interface MigrationResult {
  table: string;
  total: number;
  success: number;
  failed: number;
  errors: Array<{ record: any; error: string }>;
}

/**
 * Migrate users from current backend to Supabase
 */
export const migrateUsers = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    table: 'user',
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log('[Migration] Starting user migration...');

    // Fetch users from current backend
    const users = await authenticatedGet('/api/users');
    result.total = users.length;

    // Insert each user into Supabase
    for (const user of users) {
      try {
        await supabaseInsert('user', {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified || false,
          image: user.image || null,
          created_at: user.createdAt || new Date().toISOString(),
          updated_at: user.updatedAt || new Date().toISOString(),
        });
        result.success++;
        console.log(`[Migration] User ${user.email} migrated successfully`);
      } catch (error: any) {
        result.failed++;
        result.errors.push({ record: user, error: error.message });
        console.error(`[Migration] Failed to migrate user ${user.email}:`, error);
      }
    }

    console.log('[Migration] User migration complete:', result);
    return result;
  } catch (error: any) {
    console.error('[Migration] User migration failed:', error);
    throw error;
  }
};

/**
 * Migrate shifts from current backend to Supabase
 */
export const migrateShifts = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    table: 'shifts',
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log('[Migration] Starting shift migration...');

    // Fetch shifts from current backend
    const shifts = await authenticatedGet('/api/shifts');
    result.total = shifts.length;

    // Insert each shift into Supabase
    for (const shift of shifts) {
      try {
        await supabaseInsert('shifts', {
          id: shift.id,
          support_worker_id: shift.supportWorkerId,
          service_provider_id: shift.serviceProviderId,
          title: shift.title,
          description: shift.description || null,
          start_time: shift.startTime,
          end_time: shift.endTime,
          location: shift.location || null,
          status: shift.status,
          hourly_rate: shift.hourlyRate || null,
          created_at: shift.createdAt || new Date().toISOString(),
          updated_at: shift.updatedAt || new Date().toISOString(),
        });
        result.success++;
        console.log(`[Migration] Shift ${shift.id} migrated successfully`);
      } catch (error: any) {
        result.failed++;
        result.errors.push({ record: shift, error: error.message });
        console.error(`[Migration] Failed to migrate shift ${shift.id}:`, error);
      }
    }

    console.log('[Migration] Shift migration complete:', result);
    return result;
  } catch (error: any) {
    console.error('[Migration] Shift migration failed:', error);
    throw error;
  }
};

/**
 * Migrate timesheets from current backend to Supabase
 */
export const migrateTimesheets = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    table: 'timesheets',
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log('[Migration] Starting timesheet migration...');

    // Fetch timesheets from current backend
    const timesheets = await authenticatedGet('/api/timesheets');
    result.total = timesheets.length;

    // Insert each timesheet into Supabase
    for (const timesheet of timesheets) {
      try {
        await supabaseInsert('timesheets', {
          id: timesheet.id,
          shift_id: timesheet.shiftId,
          support_worker_id: timesheet.supportWorkerId,
          start_time: timesheet.startTime,
          end_time: timesheet.endTime || null,
          break_minutes: timesheet.breakMinutes || 0,
          total_hours: timesheet.totalHours || null,
          notes: timesheet.notes || null,
          status: timesheet.status,
          created_at: timesheet.createdAt || new Date().toISOString(),
          updated_at: timesheet.updatedAt || new Date().toISOString(),
        });
        result.success++;
        console.log(`[Migration] Timesheet ${timesheet.id} migrated successfully`);
      } catch (error: any) {
        result.failed++;
        result.errors.push({ record: timesheet, error: error.message });
        console.error(`[Migration] Failed to migrate timesheet ${timesheet.id}:`, error);
      }
    }

    console.log('[Migration] Timesheet migration complete:', result);
    return result;
  } catch (error: any) {
    console.error('[Migration] Timesheet migration failed:', error);
    throw error;
  }
};

/**
 * Migrate compliance documents from current backend to Supabase
 */
export const migrateComplianceDocuments = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    table: 'compliance_documents',
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log('[Migration] Starting compliance document migration...');

    // Fetch documents from current backend
    const documents = await authenticatedGet('/api/compliance-documents');
    result.total = documents.length;

    // Insert each document into Supabase
    for (const doc of documents) {
      try {
        await supabaseInsert('compliance_documents', {
          id: doc.id,
          support_worker_id: doc.supportWorkerId,
          service_provider_id: doc.serviceProviderId,
          document_name: doc.documentName,
          document_type: doc.documentType,
          storage_key: doc.storageKey,
          expiry_date: doc.expiryDate || null,
          status: doc.status,
          created_at: doc.createdAt || new Date().toISOString(),
          updated_at: doc.updatedAt || new Date().toISOString(),
        });
        result.success++;
        console.log(`[Migration] Document ${doc.id} migrated successfully`);
      } catch (error: any) {
        result.failed++;
        result.errors.push({ record: doc, error: error.message });
        console.error(`[Migration] Failed to migrate document ${doc.id}:`, error);
      }
    }

    console.log('[Migration] Document migration complete:', result);
    return result;
  } catch (error: any) {
    console.error('[Migration] Document migration failed:', error);
    throw error;
  }
};

/**
 * Migrate payslips from current backend to Supabase
 */
export const migratePayslips = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    table: 'payslips',
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log('[Migration] Starting payslip migration...');

    // Fetch payslips from current backend
    const payslips = await authenticatedGet('/api/payslips');
    result.total = payslips.length;

    // Insert each payslip into Supabase
    for (const payslip of payslips) {
      try {
        await supabaseInsert('payslips', {
          id: payslip.id,
          support_worker_id: payslip.supportWorkerId,
          service_provider_id: payslip.serviceProviderId,
          pay_period_start_date: payslip.payPeriodStartDate,
          pay_period_end_date: payslip.payPeriodEndDate,
          total_hours: payslip.totalHours,
          hourly_rate: payslip.hourlyRate,
          gross_pay: payslip.grossPay,
          deductions: payslip.deductions || 0,
          net_pay: payslip.netPay,
          notes: payslip.notes || null,
          status: payslip.status,
          issued_date: payslip.issuedDate || null,
          paid_date: payslip.paidDate || null,
          created_at: payslip.createdAt || new Date().toISOString(),
          updated_at: payslip.updatedAt || new Date().toISOString(),
        });
        result.success++;
        console.log(`[Migration] Payslip ${payslip.id} migrated successfully`);
      } catch (error: any) {
        result.failed++;
        result.errors.push({ record: payslip, error: error.message });
        console.error(`[Migration] Failed to migrate payslip ${payslip.id}:`, error);
      }
    }

    console.log('[Migration] Payslip migration complete:', result);
    return result;
  } catch (error: any) {
    console.error('[Migration] Payslip migration failed:', error);
    throw error;
  }
};

/**
 * Run all migrations in sequence
 */
export const runAllMigrations = async (): Promise<MigrationResult[]> => {
  console.log('[Migration] Starting full data migration...');

  const results: MigrationResult[] = [];

  try {
    // Migrate in order of dependencies
    results.push(await migrateUsers());
    results.push(await migrateShifts());
    results.push(await migrateTimesheets());
    results.push(await migrateComplianceDocuments());
    results.push(await migratePayslips());

    console.log('[Migration] All migrations complete!');
    console.log('[Migration] Summary:', results);

    return results;
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
};

/**
 * Generate migration report
 */
export const generateMigrationReport = (results: MigrationResult[]): string => {
  let report = '=== Data Migration Report ===\n\n';

  let totalRecords = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const result of results) {
    totalRecords += result.total;
    totalSuccess += result.success;
    totalFailed += result.failed;

    report += `Table: ${result.table}\n`;
    report += `  Total: ${result.total}\n`;
    report += `  Success: ${result.success}\n`;
    report += `  Failed: ${result.failed}\n`;

    if (result.errors.length > 0) {
      report += `  Errors:\n`;
      result.errors.forEach((error, index) => {
        report += `    ${index + 1}. ${error.error}\n`;
      });
    }

    report += '\n';
  }

  report += '=== Summary ===\n';
  report += `Total Records: ${totalRecords}\n`;
  report += `Total Success: ${totalSuccess}\n`;
  report += `Total Failed: ${totalFailed}\n`;
  report += `Success Rate: ${((totalSuccess / totalRecords) * 100).toFixed(2)}%\n`;

  return report;
};

/**
 * Example usage:
 * 
 * // Migrate all data
 * const results = await runAllMigrations();
 * const report = generateMigrationReport(results);
 * console.log(report);
 * 
 * // Or migrate individual tables
 * const userResult = await migrateUsers();
 * const shiftResult = await migrateShifts();
 */
