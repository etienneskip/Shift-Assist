import { pgTable, text, timestamp, uuid, integer, boolean, numeric, decimal, real } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

/**
 * User Roles: 'support_worker' | 'service_provider'
 */
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['support_worker', 'service_provider'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Shifts: Work shifts assigned to support workers
 */
export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  supportWorkerId: text('support_worker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  serviceProviderId: text('service_provider_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: text('location'),
  status: text('status', { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }).default('scheduled').notNull(),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Timesheets: Recording of hours worked
 */
export const timesheets = pgTable('timesheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  supportWorkerId: text('support_worker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  breakMinutes: integer('break_minutes').default(0),
  totalHours: numeric('total_hours', { precision: 5, scale: 2 }),
  notes: text('notes'),
  status: text('status', { enum: ['draft', 'submitted', 'approved', 'rejected'] }).default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Documents: Files uploaded for shifts or timesheets
 */
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploadedBy: text('uploaded_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  shiftId: uuid('shift_id').references(() => shifts.id, { onDelete: 'cascade' }),
  timesheetId: uuid('timesheet_id').references(() => timesheets.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  storageKey: text('storage_key').notNull(),
  fileSize: integer('file_size'),
  documentType: text('document_type', { enum: ['invoice', 'receipt', 'proof', 'report', 'other'] }).default('other').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Shift Assignments: Track which support workers are assigned to shifts
 */
export const shiftAssignments = pgTable('shift_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  supportWorkerId: text('support_worker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['assigned', 'accepted', 'declined', 'completed'] }).default('assigned').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Service Providers: Company information for service providers
 */
export const serviceProviders = pgTable('service_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  companyABN: text('company_abn'),
  companyEmail: text('company_email'),
  companyPhone: text('company_phone'),
  companyAddress: text('company_address'),
  website: text('website'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Support Workers: Individual worker information
 */
export const supportWorkers = pgTable('support_workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  dateOfBirth: timestamp('date_of_birth'),
  phoneNumber: text('phone_number'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Worker-Provider Relationships: Link support workers to service providers
 */
export const workerProviderRelationships = pgTable('worker_provider_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  supportWorkerId: text('support_worker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  serviceProviderId: text('service_provider_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'inactive'] }).default('active').notNull(),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Compliance Documents: Certifications and compliance documents for support workers
 */
export const complianceDocuments = pgTable('compliance_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  supportWorkerId: text('support_worker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  serviceProviderId: text('service_provider_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  documentName: text('document_name').notNull(),
  documentType: text('document_type', { enum: ['certification', 'police_check', 'wwcc', 'insurance', 'training', 'other'] }).notNull(),
  storageKey: text('storage_key').notNull(),
  expiryDate: timestamp('expiry_date'),
  status: text('status', { enum: ['valid', 'expiring_soon', 'expired'] }).default('valid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Shift Notes: Notes and tasks for each client per shift
 */
export const shiftNotes = pgTable('shift_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  clientName: text('client_name'),
  clientId: text('client_id'),
  taskDescription: text('task_description'),
  notes: text('notes'),
  specialRequirements: text('special_requirements'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Payslips: Payment records for support workers
 */
export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  supportWorkerId: text('support_worker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  serviceProviderId: text('service_provider_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  payPeriodStartDate: timestamp('pay_period_start_date').notNull(),
  payPeriodEndDate: timestamp('pay_period_end_date').notNull(),
  totalHours: numeric('total_hours', { precision: 8, scale: 2 }).notNull(),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  grossPay: numeric('gross_pay', { precision: 10, scale: 2 }).notNull(),
  deductions: numeric('deductions', { precision: 10, scale: 2 }).default('0'),
  netPay: numeric('net_pay', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['draft', 'issued', 'paid'] }).default('draft').notNull(),
  issuedDate: timestamp('issued_date'),
  paidDate: timestamp('paid_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Payslip Items: Line items for detailed payslip breakdown
 */
export const payslipItems = pgTable('payslip_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  payslipId: uuid('payslip_id').notNull().references(() => payslips.id, { onDelete: 'cascade' }),
  itemType: text('item_type', { enum: ['shift_hours', 'overtime', 'allowance', 'deduction', 'tax', 'other'] }).notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 8, scale: 2 }),
  rate: numeric('rate', { precision: 10, scale: 2 }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Clients: NDIS clients managed by service providers
 */
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceProviderId: text('service_provider_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Notification Logs: History of in-app notifications
 */
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: ['shift', 'document', 'timesheet', 'general'] }).notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Push Notification Tokens: Device tokens for Expo push notifications
 */
export const pushNotificationTokens = pgTable('push_notification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform', { enum: ['ios', 'android', 'web'] }).notNull(),
  isValid: boolean('is_valid').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

/**
 * Push Notification Attempts: Logging of all push notification send attempts
 */
export const pushNotificationAttempts = pgTable('push_notification_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  notificationType: text('notification_type', { enum: ['shift', 'document', 'reminder', 'general'] }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed', 'invalid_token'] }).default('pending').notNull(),
  errorMessage: text('error_message'),
  expoMessageId: text('expo_message_id'),
  data: text('data'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});
