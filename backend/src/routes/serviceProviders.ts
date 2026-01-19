import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import type { App } from '../index.js';

export function registerServiceProviderRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Create service provider account
   */
  app.fastify.post('/api/service-providers', {
    schema: {
      description: 'Create a new service provider account',
      tags: ['service-providers'],
      body: {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          companyABN: { type: 'string' },
          companyEmail: { type: 'string' },
          companyPhone: { type: 'string' },
          companyAddress: { type: 'string' },
          website: { type: 'string' },
        },
        required: ['companyName'],
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { companyName, companyABN, companyEmail, companyPhone, companyAddress, website } = request.body as any;

    // Verify the user has service_provider role
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'User must have service_provider role' });
    }

    // Check if provider already exists
    const existing = await app.db.query.serviceProviders.findFirst({
      where: eq(schema.serviceProviders.userId, session.user.id),
    });

    if (existing) {
      return reply.status(400).send({ error: 'Service provider account already exists' });
    }

    const newProvider = await app.db
      .insert(schema.serviceProviders)
      .values({
        userId: session.user.id,
        companyName,
        companyABN,
        companyEmail,
        companyPhone,
        companyAddress,
        website,
      })
      .returning();

    return reply.status(201).send(newProvider[0]);
  });

  /**
   * Get service provider profile
   */
  app.fastify.get('/api/service-providers/profile', {
    schema: {
      description: 'Get current service provider profile',
      tags: ['service-providers'],
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const provider = await app.db.query.serviceProviders.findFirst({
      where: eq(schema.serviceProviders.userId, session.user.id),
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Service provider profile not found' });
    }

    return provider;
  });

  /**
   * Update service provider profile
   */
  app.fastify.patch('/api/service-providers/profile', {
    schema: {
      description: 'Update service provider profile',
      tags: ['service-providers'],
      body: {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          companyABN: { type: 'string' },
          companyEmail: { type: 'string' },
          companyPhone: { type: 'string' },
          companyAddress: { type: 'string' },
          website: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const updates = request.body as any;

    const updated = await app.db
      .update(schema.serviceProviders)
      .set(updates)
      .where(eq(schema.serviceProviders.userId, session.user.id))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Service provider profile not found' });
    }

    return updated[0];
  });

  /**
   * Get all support workers assigned to this service provider
   */
  app.fastify.get('/api/service-providers/workers', {
    schema: {
      description: 'Get all support workers assigned to this service provider',
      tags: ['service-providers'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { status } = request.query as { status?: string };

    let whereCondition: any = eq(schema.workerProviderRelationships.serviceProviderId, session.user.id);

    if (status) {
      whereCondition = and(whereCondition, eq(schema.workerProviderRelationships.status, status as any));
    }

    const workers = await app.db.query.workerProviderRelationships.findMany({
      where: whereCondition,
    });

    return workers;
  });

  /**
   * Get details for a specific support worker assigned to this provider
   */
  app.fastify.get('/api/service-providers/workers/:workerId', {
    schema: {
      description: 'Get details for a support worker assigned to this provider',
      tags: ['service-providers'],
      params: {
        type: 'object',
        properties: { workerId: { type: 'string' } },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { workerId } = request.params as { workerId: string };

    // Verify the worker is assigned to this provider
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, workerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(404).send({ error: 'Worker not assigned to this provider' });
    }

    // Get worker details
    const worker = await app.db.query.supportWorkers.findFirst({
      where: eq(schema.supportWorkers.userId, workerId),
    });

    return { relationship, worker };
  });

  /**
   * Get shifts for a specific worker assigned to this provider
   */
  app.fastify.get('/api/service-providers/workers/:workerId/shifts', {
    schema: {
      description: 'Get shifts for a support worker',
      tags: ['service-providers'],
      params: {
        type: 'object',
        properties: { workerId: { type: 'string' } },
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { workerId } = request.params as { workerId: string };

    // Verify the worker is assigned to this provider
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, workerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(404).send({ error: 'Worker not assigned to this provider' });
    }

    const shifts = await app.db.query.shifts.findMany({
      where: and(
        eq(schema.shifts.supportWorkerId, workerId),
        eq(schema.shifts.serviceProviderId, session.user.id),
      ),
    });

    return shifts;
  });

  /**
   * Get timesheets for a worker with date range filtering
   */
  app.fastify.get('/api/service-providers/workers/:workerId/timesheets', {
    schema: {
      description: 'Get timesheets for a support worker with date filtering',
      tags: ['service-providers'],
      params: {
        type: 'object',
        properties: { workerId: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          status: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { workerId } = request.params as { workerId: string };
    const { startDate, endDate, status } = request.query as { startDate?: string; endDate?: string; status?: string };

    // Verify the worker is assigned to this provider
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, workerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(404).send({ error: 'Worker not assigned to this provider' });
    }

    // Get all timesheets for the worker
    let whereCondition: any = eq(schema.timesheets.supportWorkerId, workerId);

    if (status) {
      whereCondition = and(whereCondition, eq(schema.timesheets.status, status as any));
    }

    const timesheets = await app.db.query.timesheets.findMany({
      where: whereCondition,
    });

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      return timesheets.filter((ts: any) => {
        const tsDate = new Date(ts.startTime);
        if (start && tsDate < start) return false;
        if (end && tsDate > end) return false;
        return true;
      });
    }

    return timesheets;
  });

  /**
   * Get compliance documents for a worker
   */
  app.fastify.get('/api/service-providers/workers/:workerId/compliance-documents', {
    schema: {
      description: 'Get compliance documents for a support worker',
      tags: ['service-providers'],
      params: {
        type: 'object',
        properties: { workerId: { type: 'string' } },
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { workerId } = request.params as { workerId: string };

    // Verify the worker is assigned to this provider
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, workerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(404).send({ error: 'Worker not assigned to this provider' });
    }

    const documents = await app.db.query.complianceDocuments.findMany({
      where: and(
        eq(schema.complianceDocuments.supportWorkerId, workerId),
        eq(schema.complianceDocuments.serviceProviderId, session.user.id),
      ),
    });

    return documents;
  });

  /**
   * Get shift notes and client information for a shift
   */
  app.fastify.get('/api/service-providers/shifts/:shiftId/notes', {
    schema: {
      description: 'Get notes and client information for a shift',
      tags: ['service-providers'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };

    // Verify the shift belongs to this provider
    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, shiftId),
    });

    if (!shift || (shift as any).serviceProviderId !== session.user.id) {
      return reply.status(404).send({ error: 'Shift not found or not assigned to this provider' });
    }

    const notes = await app.db.query.shiftNotes.findFirst({
      where: eq(schema.shiftNotes.shiftId, shiftId),
    });

    return { shift, notes };
  });

  /**
   * Get comprehensive service provider dashboard
   */
  app.fastify.get('/api/service-providers/dashboard', {
    schema: {
      description: 'Get comprehensive dashboard with all worker information',
      tags: ['service-providers'],
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    // Get service provider info
    const provider = await app.db.query.serviceProviders.findFirst({
      where: eq(schema.serviceProviders.userId, session.user.id),
    });

    // Get all workers assigned to this provider
    const workerRelationships = await app.db.query.workerProviderRelationships.findMany({
      where: eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
    });

    // Get all shifts for this provider
    const shifts = await app.db.query.shifts.findMany({
      where: eq(schema.shifts.serviceProviderId, session.user.id),
    });

    // Get all payslips for this provider
    const payslips = await app.db.query.payslips.findMany({
      where: eq(schema.payslips.serviceProviderId, session.user.id),
    });

    // Enrich worker relationships with detailed information
    const workersWithDetails = await Promise.all(
      workerRelationships.map(async (rel: any) => {
        const workerUser = await app.db.query.user.findFirst({
          where: eq(authSchema.user.id, rel.supportWorkerId),
        });

        const workerProfile = await app.db.query.supportWorkers.findFirst({
          where: eq(schema.supportWorkers.userId, rel.supportWorkerId),
        });

        // Get worker shifts
        const workerShifts = shifts.filter((s: any) => s.supportWorkerId === rel.supportWorkerId);

        // Get worker timesheets
        const timesheets = await app.db.query.timesheets.findMany({
          where: eq(schema.timesheets.supportWorkerId, rel.supportWorkerId),
        });

        // Get worker compliance documents
        const complianceDocs = await app.db.query.complianceDocuments.findMany({
          where: and(
            eq(schema.complianceDocuments.supportWorkerId, rel.supportWorkerId),
            eq(schema.complianceDocuments.serviceProviderId, session.user.id),
          ),
        });

        // Get worker payslips
        const workerPayslips = payslips.filter((p: any) => p.supportWorkerId === rel.supportWorkerId);

        // Calculate total hours and earnings
        const totalHours = workerPayslips.reduce((sum: number, p: any) => {
          return sum + parseFloat(p.totalHours?.toString() || '0');
        }, 0);

        const totalEarnings = workerPayslips.reduce((sum: number, p: any) => {
          return sum + (p.status === 'paid' ? parseFloat(p.netPay?.toString() || '0') : 0);
        }, 0);

        return {
          relationship: rel,
          worker: {
            id: rel.supportWorkerId,
            name: workerUser?.name || 'Unknown',
            email: workerUser?.email || 'Unknown',
            profile: workerProfile,
          },
          shiftCount: workerShifts.length,
          timesheetCount: timesheets.length,
          complianceDocumentsCount: complianceDocs.length,
          payslipCount: workerPayslips.length,
          totalHours,
          totalEarnings,
          status: rel.status,
          hourlyRate: rel.hourlyRate,
        };
      }),
    );

    // Calculate dashboard statistics
    const totalShifts = shifts.length;
    const totalWorkers = workerRelationships.length;
    const totalPayslips = payslips.length;
    const totalPaid = payslips
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + parseFloat(p.netPay?.toString() || '0'), 0);

    return {
      provider: {
        ...provider,
        ownerName: session.user.name,
        ownerEmail: session.user.email,
      },
      statistics: {
        totalWorkers,
        totalShifts,
        totalPayslips,
        totalPaid,
      },
      workers: workersWithDetails,
      recentPayslips: payslips.slice(-10),
      recentShifts: shifts.slice(-10),
    };
  });
}
