import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerSupportWorkerRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Create support worker account
   */
  app.fastify.post('/api/support-workers', {
    schema: {
      description: 'Create a new support worker account',
      tags: ['support-workers'],
      body: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string' },
          address: { type: 'string' },
          dateOfBirth: { type: 'string' },
          serviceProviderIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { phoneNumber, address, dateOfBirth, serviceProviderIds = [] } = request.body as any;

    // Verify the user has support_worker role
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'support_worker' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'User must have support_worker role' });
    }

    // Check if worker profile already exists
    const existing = await app.db.query.supportWorkers.findFirst({
      where: eq(schema.supportWorkers.userId, session.user.id),
    });

    if (existing) {
      return reply.status(400).send({ error: 'Support worker profile already exists' });
    }

    const newWorker = await app.db
      .insert(schema.supportWorkers)
      .values({
        userId: session.user.id,
        phoneNumber,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      })
      .returning();

    // Link to service providers if specified
    if (serviceProviderIds.length > 0) {
      for (const providerId of serviceProviderIds) {
        await app.db
          .insert(schema.workerProviderRelationships)
          .values({
            supportWorkerId: session.user.id,
            serviceProviderId: providerId,
            status: 'active',
          })
          .catch(() => null); // Ignore errors for invalid provider IDs
      }
    }

    return reply.status(201).send(newWorker[0]);
  });

  /**
   * Get support worker profile
   */
  app.fastify.get('/api/support-workers/profile', {
    schema: {
      description: 'Get current support worker profile',
      tags: ['support-workers'],
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const worker = await app.db.query.supportWorkers.findFirst({
      where: eq(schema.supportWorkers.userId, session.user.id),
    });

    if (!worker) {
      return reply.status(404).send({ error: 'Support worker profile not found' });
    }

    return worker;
  });

  /**
   * Update support worker profile
   */
  app.fastify.patch('/api/support-workers/profile', {
    schema: {
      description: 'Update support worker profile',
      tags: ['support-workers'],
      body: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string' },
          address: { type: 'string' },
          dateOfBirth: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { phoneNumber, address, dateOfBirth } = request.body as any;
    const updates: any = {};

    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (address !== undefined) updates.address = address;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    const updated = await app.db
      .update(schema.supportWorkers)
      .set(updates)
      .where(eq(schema.supportWorkers.userId, session.user.id))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Support worker profile not found' });
    }

    return updated[0];
  });

  /**
   * Get all service providers this worker is linked to
   */
  app.fastify.get('/api/support-workers/providers', {
    schema: {
      description: 'Get all service providers this worker is linked to',
      tags: ['support-workers'],
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

    let whereCondition: any = eq(schema.workerProviderRelationships.supportWorkerId, session.user.id);

    if (status) {
      whereCondition = and(whereCondition, eq(schema.workerProviderRelationships.status, status as any));
    }

    const providers = await app.db.query.workerProviderRelationships.findMany({
      where: whereCondition,
    });

    return providers;
  });

  /**
   * Link to a service provider
   */
  app.fastify.post('/api/support-workers/providers/:providerId/link', {
    schema: {
      description: 'Link to a service provider',
      tags: ['support-workers'],
      params: {
        type: 'object',
        properties: { providerId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          hourlyRate: { type: 'string' },
        },
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { providerId } = request.params as { providerId: string };
    const { hourlyRate } = request.body as any;

    // Check if already linked
    const existing = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, session.user.id),
        eq(schema.workerProviderRelationships.serviceProviderId, providerId),
      ),
    });

    if (existing) {
      return reply.status(400).send({ error: 'Already linked to this service provider' });
    }

    // Verify the provider exists
    const provider = await app.db.query.serviceProviders.findFirst({
      where: eq(schema.serviceProviders.userId, providerId),
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Service provider not found' });
    }

    const relationship = await app.db
      .insert(schema.workerProviderRelationships)
      .values({
        supportWorkerId: session.user.id,
        serviceProviderId: providerId,
        status: 'active',
        hourlyRate,
      })
      .returning();

    return reply.status(201).send(relationship[0]);
  });

  /**
   * Unlink from a service provider
   */
  app.fastify.post('/api/support-workers/providers/:providerId/unlink', {
    schema: {
      description: 'Unlink from a service provider',
      tags: ['support-workers'],
      params: {
        type: 'object',
        properties: { providerId: { type: 'string' } },
      },
      response: { 204: { type: 'null' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { providerId } = request.params as { providerId: string };

    await app.db
      .delete(schema.workerProviderRelationships)
      .where(
        and(
          eq(schema.workerProviderRelationships.supportWorkerId, session.user.id),
          eq(schema.workerProviderRelationships.serviceProviderId, providerId),
        ),
      );

    return reply.status(204).send();
  });

  /**
   * Get all assigned shifts
   */
  app.fastify.get('/api/support-workers/shifts', {
    schema: {
      description: 'Get all assigned shifts for the current worker',
      tags: ['support-workers'],
      querystring: {
        type: 'object',
        properties: {
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

    const { status } = request.query as { status?: string };

    let whereCondition: any = eq(schema.shifts.supportWorkerId, session.user.id);

    if (status) {
      whereCondition = and(whereCondition, eq(schema.shifts.status, status as any));
    }

    const shifts = await app.db.query.shifts.findMany({
      where: whereCondition,
    });

    return shifts;
  });

  /**
   * Get all payslips for the current worker
   */
  app.fastify.get('/api/support-workers/payslips', {
    schema: {
      description: 'Get all payslips for the current worker',
      tags: ['support-workers'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'issued', 'paid'] },
          providerId: { type: 'string' },
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

    const { status, providerId } = request.query as { status?: string; providerId?: string };

    let whereCondition: any = eq(schema.payslips.supportWorkerId, session.user.id);

    if (status) {
      whereCondition = and(whereCondition, eq(schema.payslips.status, status as any));
    }

    if (providerId) {
      whereCondition = and(whereCondition, eq(schema.payslips.serviceProviderId, providerId));
    }

    const payslips = await app.db.query.payslips.findMany({
      where: whereCondition,
    });

    return payslips;
  });

  /**
   * Get payslip details with line items
   */
  app.fastify.get('/api/support-workers/payslips/:payslipId', {
    schema: {
      description: 'Get payslip details with line items',
      tags: ['support-workers'],
      params: {
        type: 'object',
        properties: { payslipId: { type: 'string' } },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { payslipId } = request.params as { payslipId: string };

    const payslip = await app.db.query.payslips.findFirst({
      where: eq(schema.payslips.id, payslipId),
    });

    if (!payslip || (payslip as any).supportWorkerId !== session.user.id) {
      return reply.status(404).send({ error: 'Payslip not found' });
    }

    const items = await app.db.query.payslipItems.findMany({
      where: eq(schema.payslipItems.payslipId, payslipId),
    });

    return { payslip, items };
  });

  /**
   * Update worker-provider relationship status
   */
  app.fastify.patch('/api/support-workers/providers/:providerId/status', {
    schema: {
      description: 'Update relationship status with a service provider',
      tags: ['support-workers'],
      params: {
        type: 'object',
        properties: { providerId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
        required: ['status'],
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { providerId } = request.params as { providerId: string };
    const { status } = request.body as { status: 'active' | 'inactive' };

    const updated = await app.db
      .update(schema.workerProviderRelationships)
      .set({ status })
      .where(
        and(
          eq(schema.workerProviderRelationships.supportWorkerId, session.user.id),
          eq(schema.workerProviderRelationships.serviceProviderId, providerId),
        ),
      )
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Relationship not found' });
    }

    return updated[0];
  });
}
