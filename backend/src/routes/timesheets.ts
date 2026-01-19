import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerTimesheetRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Get all timesheets (with optional filtering)
   */
  app.fastify.get('/api/timesheets', {
    schema: {
      description: 'Get all timesheets',
      tags: ['timesheets'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          userId: { type: 'string' },
          shiftId: { type: 'string' },
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

    const { status, userId, shiftId } = request.query as {
      status?: string;
      userId?: string;
      shiftId?: string;
    };

    let whereCondition: any = true;

    if (status) {
      whereCondition = and(whereCondition, eq(schema.timesheets.status, status as any));
    }

    if (userId) {
      whereCondition = and(whereCondition, eq(schema.timesheets.supportWorkerId, userId));
    }

    if (shiftId) {
      whereCondition = and(whereCondition, eq(schema.timesheets.shiftId, shiftId));
    }

    const timesheets = whereCondition === true
      ? await app.db.query.timesheets.findMany()
      : await app.db.query.timesheets.findMany({ where: whereCondition });

    return timesheets;
  });

  /**
   * Get timesheet by ID
   */
  app.fastify.get('/api/timesheets/:id', {
    schema: {
      description: 'Get a timesheet by ID',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: { type: 'object' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const timesheet = await app.db.query.timesheets.findFirst({
      where: eq(schema.timesheets.id, id),
    });

    if (!timesheet) {
      return reply.status(404).send({ error: 'Timesheet not found' });
    }

    return timesheet;
  });

  /**
   * Create a new timesheet
   */
  app.fastify.post('/api/timesheets', {
    schema: {
      description: 'Create a new timesheet',
      tags: ['timesheets'],
      body: {
        type: 'object',
        properties: {
          shiftId: { type: 'string' },
          supportWorkerId: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          breakMinutes: { type: 'integer' },
          notes: { type: 'string' },
        },
        required: ['shiftId', 'supportWorkerId', 'startTime'],
      },
      response: {
        201: { type: 'object' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const {
      shiftId,
      supportWorkerId,
      startTime,
      endTime,
      breakMinutes = 0,
      notes,
    } = request.body as any;

    // Calculate total hours if endTime is provided
    let totalHours: number | null = null;
    if (endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const durationMs = end - start;
      const totalMinutes = durationMs / (1000 * 60);
      totalHours = (totalMinutes - breakMinutes) / 60;
    }

    const newTimesheet = await app.db
      .insert(schema.timesheets)
      .values({
        shiftId,
        supportWorkerId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        breakMinutes,
        totalHours: totalHours ? totalHours.toString() : null,
        notes,
      })
      .returning();

    return reply.status(201).send(newTimesheet[0]);
  });

  /**
   * Update a timesheet
   */
  app.fastify.patch('/api/timesheets/:id', {
    schema: {
      description: 'Update a timesheet',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          endTime: { type: 'string' },
          breakMinutes: { type: 'integer' },
          notes: { type: 'string' },
          status: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const updates = request.body as any;

    // Get existing timesheet to calculate hours if endTime is being updated
    const existing = await app.db.query.timesheets.findFirst({
      where: eq(schema.timesheets.id, id),
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Timesheet not found' });
    }

    if (updates.endTime) {
      updates.endTime = new Date(updates.endTime);
      const start = existing.startTime.getTime();
      const end = updates.endTime.getTime();
      const durationMs = end - start;
      const totalMinutes = durationMs / (1000 * 60);
      const breakMins = updates.breakMinutes ?? existing.breakMinutes ?? 0;
      updates.totalHours = ((totalMinutes - breakMins) / 60).toString();
    }

    const updatedTimesheet = await app.db
      .update(schema.timesheets)
      .set(updates)
      .where(eq(schema.timesheets.id, id))
      .returning();

    return updatedTimesheet[0];
  });

  /**
   * Delete a timesheet
   */
  app.fastify.delete('/api/timesheets/:id', {
    schema: {
      description: 'Delete a timesheet',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: { 204: { type: 'null' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const deleted = await app.db
      .delete(schema.timesheets)
      .where(eq(schema.timesheets.id, id))
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({ error: 'Timesheet not found' });
    }

    return reply.status(204).send();
  });

  /**
   * Submit timesheet for approval
   */
  app.fastify.post('/api/timesheets/:id/submit', {
    schema: {
      description: 'Submit a timesheet for approval',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const updated = await app.db
      .update(schema.timesheets)
      .set({ status: 'submitted' })
      .where(eq(schema.timesheets.id, id))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Timesheet not found' });
    }

    return updated[0];
  });

  /**
   * Approve timesheet
   */
  app.fastify.post('/api/timesheets/:id/approve', {
    schema: {
      description: 'Approve a timesheet',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const updated = await app.db
      .update(schema.timesheets)
      .set({ status: 'approved' })
      .where(eq(schema.timesheets.id, id))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Timesheet not found' });
    }

    return updated[0];
  });

  /**
   * Reject timesheet
   */
  app.fastify.post('/api/timesheets/:id/reject', {
    schema: {
      description: 'Reject a timesheet',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const updated = await app.db
      .update(schema.timesheets)
      .set({ status: 'rejected' })
      .where(eq(schema.timesheets.id, id))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Timesheet not found' });
    }

    return updated[0];
  });

  /**
   * Get timesheet summary for a user
   */
  app.fastify.get('/api/timesheets/summary/:userId', {
    schema: {
      description: 'Get timesheet summary for a user',
      tags: ['timesheets'],
      params: {
        type: 'object',
        properties: { userId: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalHours: { type: 'number' },
            totalTimesheets: { type: 'integer' },
            approvedTimesheets: { type: 'integer' },
            pendingTimesheets: { type: 'integer' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { userId } = request.params as { userId: string };

    const timesheets = await app.db.query.timesheets.findMany({
      where: eq(schema.timesheets.supportWorkerId, userId),
    });

    const totalHours = timesheets.reduce((sum, ts) => {
      return sum + (ts.totalHours ? parseFloat(ts.totalHours.toString()) : 0);
    }, 0);

    return {
      totalHours,
      totalTimesheets: timesheets.length,
      approvedTimesheets: timesheets.filter(ts => ts.status === 'approved').length,
      pendingTimesheets: timesheets.filter(ts => ts.status === 'submitted').length,
    };
  });
}
