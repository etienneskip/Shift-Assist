import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerUserRoutes } from './routes/users.js';
import { registerShiftRoutes } from './routes/shifts.js';
import { registerTimesheetRoutes } from './routes/timesheets.js';
import { registerDocumentRoutes } from './routes/documents.js';
import { registerServiceProviderRoutes } from './routes/serviceProviders.js';
import { registerSupportWorkerRoutes } from './routes/supportWorkers.js';
import { registerComplianceDocumentRoutes } from './routes/complianceDocuments.js';
import { registerPayslipRoutes } from './routes/payslips.js';
import { registerShiftNotesRoutes } from './routes/shiftNotes.js';
import { registerClientRoutes } from './routes/clients.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerPushNotificationRoutes } from './routes/pushNotifications.js';
import { registerSpeechToTextRoutes } from './routes/speechToText.js';
import { registerReportsRoutes } from './routes/reports.js';

// Combine all schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Better Auth
app.withAuth();

// Enable storage for document uploads
app.withStorage();

// Home/Health check endpoint
app.fastify.get('/api/health', async () => {
  return {
    status: 'ok',
    app: 'Support Worker Shift Management System',
    timestamp: new Date().toISOString()
  };
});

// Root endpoint with app info
app.fastify.get('/api', async () => {
  return {
    name: 'Support Worker Shift',
    description: 'NDIS Support Worker Shift Management System',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      shifts: '/api/shifts',
      timesheets: '/api/timesheets',
      documents: '/api/documents',
    },
  };
});

// Register all route modules
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerUserRoutes(app);
registerShiftRoutes(app);
registerTimesheetRoutes(app);
registerDocumentRoutes(app);
registerServiceProviderRoutes(app);
registerSupportWorkerRoutes(app);
registerComplianceDocumentRoutes(app);
registerPayslipRoutes(app);
registerShiftNotesRoutes(app);
registerClientRoutes(app);
registerNotificationRoutes(app);
registerPushNotificationRoutes(app);
registerSpeechToTextRoutes(app);
registerReportsRoutes(app);

await app.run();
app.logger.info('NDIS Support Worker Shift Management System running');
