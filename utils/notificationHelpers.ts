
/**
 * Notification Helpers
 * 
 * Helper functions to trigger push notifications for various app events.
 * These functions wrap the Expo Push Notification API calls with
 * app-specific logic for different notification types.
 */

import {
  sendNotification,
  sendBulkNotification,
  sendShiftNotification,
  sendDocumentExpiryNotification,
} from './pushNotifications';

/**
 * Send notification when a new shift is created
 */
export const notifyNewShift = async (
  shiftId: string,
  supportWorkerId: string,
  shiftTitle: string,
  shiftTime: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending new shift notification...');
  
  try {
    // Use the backend endpoint that handles shift notifications
    return await sendShiftNotification(supportWorkerId, shiftId, 'new', shiftTitle, shiftTime);
  } catch (error) {
    console.error('[NotificationHelper] Error sending new shift notification:', error);
    return false;
  }
};

/**
 * Send notification when a shift is updated
 */
export const notifyShiftUpdate = async (
  shiftId: string,
  supportWorkerId: string,
  shiftTitle: string,
  shiftTime: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending shift update notification...');
  
  try {
    return await sendShiftNotification(supportWorkerId, shiftId, 'update', shiftTitle, shiftTime);
  } catch (error) {
    console.error('[NotificationHelper] Error sending shift update notification:', error);
    return false;
  }
};

/**
 * Send notification reminder before a shift starts
 */
export const notifyShiftReminder = async (
  shiftId: string,
  supportWorkerId: string,
  shiftTitle: string,
  shiftTime: string,
  hoursBeforeShift: number = 1
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending shift reminder notification...');
  
  try {
    return await sendShiftNotification(supportWorkerId, shiftId, 'reminder', shiftTitle, shiftTime);
  } catch (error) {
    console.error('[NotificationHelper] Error sending shift reminder:', error);
    return false;
  }
};

/**
 * Send notification when a document is about to expire
 */
export const notifyDocumentExpiry = async (
  supportWorkerId: string,
  documentName: string,
  daysUntilExpiry: number
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending document expiry notification...');
  
  try {
    return await sendDocumentExpiryNotification(supportWorkerId, documentName, daysUntilExpiry);
  } catch (error) {
    console.error('[NotificationHelper] Error sending document expiry notification:', error);
    return false;
  }
};

/**
 * Send notification when a timesheet is approved
 */
export const notifyTimesheetApproved = async (
  supportWorkerId: string,
  timesheetId: string,
  shiftTitle: string,
  totalHours: number
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending timesheet approved notification...');
  
  try {
    return await sendNotification(
      supportWorkerId,
      'Timesheet Approved',
      `Your timesheet for "${shiftTitle}" (${totalHours} hours) has been approved.`,
      'timesheet',
      {
        timesheetId,
        shiftTitle,
        totalHours,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending timesheet approved notification:', error);
    return false;
  }
};

/**
 * Send notification when a shift note is added
 */
export const notifyShiftNoteAdded = async (
  serviceProviderId: string,
  shiftId: string,
  shiftTitle: string,
  workerName: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending shift note notification...');
  
  try {
    return await sendNotification(
      serviceProviderId,
      'New Shift Note',
      `${workerName} added a note to shift: ${shiftTitle}`,
      'shift',
      {
        shiftId,
        shiftTitle,
        workerName,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending shift note notification:', error);
    return false;
  }
};

/**
 * Send notification when a worker clocks in
 */
export const notifyClockIn = async (
  serviceProviderId: string,
  shiftId: string,
  shiftTitle: string,
  workerName: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending clock in notification...');
  
  try {
    return await sendNotification(
      serviceProviderId,
      'Worker Clocked In',
      `${workerName} has clocked in for: ${shiftTitle}`,
      'shift',
      {
        shiftId,
        shiftTitle,
        workerName,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending clock in notification:', error);
    return false;
  }
};

/**
 * Send notification when a worker clocks out
 */
export const notifyClockOut = async (
  serviceProviderId: string,
  shiftId: string,
  shiftTitle: string,
  workerName: string,
  totalHours: number
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending clock out notification...');
  
  try {
    return await sendNotification(
      serviceProviderId,
      'Worker Clocked Out',
      `${workerName} has clocked out from: ${shiftTitle} (${totalHours} hours)`,
      'shift',
      {
        shiftId,
        shiftTitle,
        workerName,
        totalHours,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending clock out notification:', error);
    return false;
  }
};

/**
 * Send notification to multiple workers about a new job posting
 */
export const notifyNewJobPosting = async (
  workerIds: string[],
  jobTitle: string,
  jobDate: string,
  location: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending new job posting notification...');
  
  try {
    return await sendBulkNotification(
      workerIds,
      'New Job Available',
      `${jobTitle} on ${jobDate} at ${location}`,
      'shift',
      {
        jobTitle,
        jobDate,
        location,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending job posting notification:', error);
    return false;
  }
};

/**
 * Send notification when a document is uploaded
 */
export const notifyDocumentUploaded = async (
  serviceProviderId: string,
  documentName: string,
  workerName: string,
  documentType: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending document uploaded notification...');
  
  try {
    return await sendNotification(
      serviceProviderId,
      'New Document Uploaded',
      `${workerName} uploaded: ${documentName} (${documentType})`,
      'document',
      {
        documentName,
        workerName,
        documentType,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending document uploaded notification:', error);
    return false;
  }
};

/**
 * Send notification when a shift is cancelled
 */
export const notifyShiftCancelled = async (
  supportWorkerId: string,
  shiftTitle: string,
  shiftDate: string,
  reason?: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending shift cancelled notification...');
  
  try {
    const message = reason
      ? `Shift "${shiftTitle}" on ${shiftDate} has been cancelled. Reason: ${reason}`
      : `Shift "${shiftTitle}" on ${shiftDate} has been cancelled.`;
    
    return await sendNotification(
      supportWorkerId,
      'Shift Cancelled',
      message,
      'shift',
      {
        shiftTitle,
        shiftDate,
        reason,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending shift cancelled notification:', error);
    return false;
  }
};

/**
 * Send notification when a worker is assigned to a shift
 */
export const notifyShiftAssignment = async (
  supportWorkerId: string,
  shiftId: string,
  shiftTitle: string,
  shiftDate: string,
  clientName: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending shift assignment notification...');
  
  try {
    return await sendNotification(
      supportWorkerId,
      'New Shift Assignment',
      `You've been assigned to "${shiftTitle}" on ${shiftDate} for ${clientName}`,
      'shift',
      {
        shiftId,
        shiftTitle,
        shiftDate,
        clientName,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending shift assignment notification:', error);
    return false;
  }
};

/**
 * Send notification when a message is received
 */
export const notifyNewMessage = async (
  recipientId: string,
  senderName: string,
  messagePreview: string
): Promise<boolean> => {
  console.log('[NotificationHelper] Sending new message notification...');
  
  try {
    return await sendNotification(
      recipientId,
      `Message from ${senderName}`,
      messagePreview,
      'general',
      {
        senderName,
      }
    );
  } catch (error) {
    console.error('[NotificationHelper] Error sending new message notification:', error);
    return false;
  }
};
