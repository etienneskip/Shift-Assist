import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import * as reportGenerator from '../services/reportGenerator.js';
import type { App } from '../index.js';

export function registerReportsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Generate and download service provider shift report as PDF
   */
  app.fastify.get('/api/reports/service-provider-shifts', {
    schema: {
      description: 'Generate a PDF report of shifts for a service provider',
      tags: ['reports'],
      querystring: {
        type: 'object',
        properties: {
          service_provider_id: {
            type: 'string',
            description: 'Service provider ID (required)',
          },
          startDate: {
            type: 'string',
            description: 'Start date in ISO format (optional, defaults to 30 days ago)',
          },
          endDate: {
            type: 'string',
            description: 'End date in ISO format (optional, defaults to today)',
          },
        },
        required: ['service_provider_id'],
      },
      response: {
        200: {
          description: 'PDF file download',
          type: 'string',
          format: 'binary',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { service_provider_id, startDate: startDateStr, endDate: endDateStr } = request.query as {
      service_provider_id: string;
      startDate?: string;
      endDate?: string;
    };

    if (!service_provider_id) {
      return reply.status(400).send({
        error: 'service_provider_id is required',
        message: 'Please provide a service provider ID',
      });
    }

    // Verify user has access to this service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({
        error: 'Unauthorized',
        message: 'Only service providers can generate reports',
      });
    }

    // Verify the service provider belongs to the authenticated user
    const serviceProvider = await app.db.query.serviceProviders.findFirst({
      where: eq(schema.serviceProviders.userId, session.user.id),
    });

    if (!serviceProvider || (serviceProvider as any).id !== service_provider_id) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this service provider',
      });
    }

    try {
      // Parse dates
      let endDate = new Date();
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Default to last 30 days

      if (endDateStr) {
        endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) {
          return reply.status(400).send({
            error: 'Invalid endDate format',
            message: 'Please use ISO format (YYYY-MM-DD)',
          });
        }
      }

      if (startDateStr) {
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) {
          return reply.status(400).send({
            error: 'Invalid startDate format',
            message: 'Please use ISO format (YYYY-MM-DD)',
          });
        }
      }

      // Normalize dates to start of day (start) and end of day (end)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      app.logger.info(
        {
          service_provider_id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        'Generating shift report',
      );

      // Query shifts with related data
      const shiftsData = await app.db
        .select({
          shift: schema.shifts,
          user: authSchema.user,
          timesheet: schema.timesheets,
          client: schema.clients,
        })
        .from(schema.shifts)
        .leftJoin(authSchema.user, eq(schema.shifts.supportWorkerId, authSchema.user.id))
        .leftJoin(schema.timesheets, eq(schema.shifts.id, schema.timesheets.shiftId))
        .leftJoin(schema.clients, eq(schema.shifts.id, schema.shifts.id)) // Join clients if available
        .where(
          and(
            eq(schema.shifts.serviceProviderId, session.user.id),
            gte(schema.shifts.startTime, startDate),
            lte(schema.shifts.startTime, endDate),
          ),
        );

      app.logger.info(
        {
          recordCount: shiftsData.length,
        },
        'Query completed',
      );

      // Transform data into report format
      const shiftsMap = new Map<string, reportGenerator.ShiftReportData>();
      const workerNames = new Set<string>();

      for (const record of shiftsData) {
        const shift = record.shift;
        const worker = record.user;
        const timesheet = record.timesheet;

        if (!shift || !worker) continue;

        const shiftKey = `${shift.id}`;

        if (!shiftsMap.has(shiftKey)) {
          workerNames.add(worker.name);

          // Get client information if available
          let clientName = 'N/A';
          if (shift.id) {
            const shiftNote = await app.db.query.shiftNotes.findFirst({
              where: eq(schema.shiftNotes.shiftId, shift.id),
            });
            if (shiftNote) {
              clientName = (shiftNote as any).clientName || 'N/A';
            }
          }

          shiftsMap.set(shiftKey, {
            workerName: worker.name,
            clientName,
            shiftDate: shift.startTime,
            scheduledStartTime: shift.startTime,
            scheduledEndTime: shift.endTime,
            clockInTime: timesheet?.startTime || null,
            clockOutTime: timesheet?.endTime || null,
            breakMinutes: timesheet?.breakMinutes || 0,
            totalHours: timesheet?.totalHours ? parseFloat(timesheet.totalHours.toString()) : 0,
          });
        }
      }

      const shifts = Array.from(shiftsMap.values());

      // Calculate summary
      const totalShifts = shifts.length;
      const totalHours = shifts.reduce((sum, shift) => sum + shift.totalHours, 0);

      const reportData: reportGenerator.ShiftReportSummary = {
        companyName: (serviceProvider as any).companyName || 'Service Provider',
        startDate,
        endDate,
        shifts,
        totalShifts,
        totalHours,
        uniqueWorkers: workerNames,
      };

      // Generate PDF
      const pdfBuffer = await reportGenerator.generateShiftReportPDF(reportData);

      app.logger.info(
        {
          pdfSize: pdfBuffer.length,
          shiftCount: totalShifts,
        },
        'PDF generated successfully',
      );

      // Set response headers
      reply.header('Content-Type', 'application/pdf');
      reply.header(
        'Content-Disposition',
        `attachment; filename="shift-report-${new Date().getTime()}.pdf"`,
      );

      return reply.send(pdfBuffer);
    } catch (error) {
      app.logger.error(
        {
          err: error,
          service_provider_id,
        },
        'Failed to generate report',
      );

      return reply.status(500).send({
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  /**
   * Get report data in JSON format (for preview/testing)
   */
  app.fastify.get('/api/reports/service-provider-shifts/preview', {
    schema: {
      description: 'Get shift report data in JSON format for preview',
      tags: ['reports'],
      querystring: {
        type: 'object',
        properties: {
          service_provider_id: {
            type: 'string',
            description: 'Service provider ID (required)',
          },
          startDate: {
            type: 'string',
            description: 'Start date in ISO format (optional)',
          },
          endDate: {
            type: 'string',
            description: 'End date in ISO format (optional)',
          },
        },
        required: ['service_provider_id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            companyName: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            shifts: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalShifts: { type: 'integer' },
                totalHours: { type: 'number' },
                uniqueWorkers: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { service_provider_id, startDate: startDateStr, endDate: endDateStr } = request.query as {
      service_provider_id: string;
      startDate?: string;
      endDate?: string;
    };

    if (!service_provider_id) {
      return reply.status(400).send({
        error: 'service_provider_id is required',
      });
    }

    // Verify access
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    const serviceProvider = await app.db.query.serviceProviders.findFirst({
      where: eq(schema.serviceProviders.userId, session.user.id),
    });

    if (!serviceProvider || (serviceProvider as any).id !== service_provider_id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      // Parse dates
      let endDate = new Date();
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      if (endDateStr) {
        endDate = new Date(endDateStr);
      }
      if (startDateStr) {
        startDate = new Date(startDateStr);
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Query shifts
      const shiftsData = await app.db
        .select({
          shift: schema.shifts,
          user: authSchema.user,
          timesheet: schema.timesheets,
        })
        .from(schema.shifts)
        .leftJoin(authSchema.user, eq(schema.shifts.supportWorkerId, authSchema.user.id))
        .leftJoin(schema.timesheets, eq(schema.shifts.id, schema.timesheets.shiftId))
        .where(
          and(
            eq(schema.shifts.serviceProviderId, session.user.id),
            gte(schema.shifts.startTime, startDate),
            lte(schema.shifts.startTime, endDate),
          ),
        );

      // Transform data
      const shiftsMap = new Map<string, reportGenerator.ShiftReportData>();
      const workerNames = new Set<string>();

      for (const record of shiftsData) {
        const shift = record.shift;
        const worker = record.user;
        const timesheet = record.timesheet;

        if (!shift || !worker) continue;

        const shiftKey = `${shift.id}`;

        if (!shiftsMap.has(shiftKey)) {
          workerNames.add(worker.name);

          // Get client information
          let clientName = 'N/A';
          if (shift.id) {
            const shiftNote = await app.db.query.shiftNotes.findFirst({
              where: eq(schema.shiftNotes.shiftId, shift.id),
            });
            if (shiftNote) {
              clientName = (shiftNote as any).clientName || 'N/A';
            }
          }

          shiftsMap.set(shiftKey, {
            workerName: worker.name,
            clientName,
            shiftDate: shift.startTime,
            scheduledStartTime: shift.startTime,
            scheduledEndTime: shift.endTime,
            clockInTime: timesheet?.startTime || null,
            clockOutTime: timesheet?.endTime || null,
            breakMinutes: timesheet?.breakMinutes || 0,
            totalHours: timesheet?.totalHours ? parseFloat(timesheet.totalHours.toString()) : 0,
          });
        }
      }

      const shifts = Array.from(shiftsMap.values());
      const totalShifts = shifts.length;
      const totalHours = shifts.reduce((sum, shift) => sum + shift.totalHours, 0);

      return {
        companyName: (serviceProvider as any).companyName || 'Service Provider',
        startDate: reportGenerator.formatDate(startDate),
        endDate: reportGenerator.formatDate(endDate),
        shifts: shifts.map((shift) => ({
          workerName: shift.workerName,
          clientName: shift.clientName,
          shiftDate: reportGenerator.formatDate(shift.shiftDate),
          scheduledStart: reportGenerator.formatTime(shift.scheduledStartTime),
          scheduledEnd: reportGenerator.formatTime(shift.scheduledEndTime),
          clockIn: shift.clockInTime ? reportGenerator.formatTime(shift.clockInTime) : 'N/A',
          clockOut: shift.clockOutTime ? reportGenerator.formatTime(shift.clockOutTime) : 'N/A',
          breakMinutes: shift.breakMinutes,
          totalHours: reportGenerator.formatHours(shift.totalHours),
        })),
        summary: {
          totalShifts,
          totalHours: reportGenerator.formatHours(totalHours),
          uniqueWorkers: workerNames.size,
        },
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to generate report preview');
      return reply.status(500).send({
        error: 'Failed to generate report preview',
      });
    }
  });
}
