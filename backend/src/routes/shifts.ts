import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import type { App } from '../index.js';

export function registerShiftRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Get all shifts (with optional filtering)
   */
  app.fastify.get('/api/shifts', {
    schema: {
      description: 'Get all shifts',
      tags: ['shifts'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          userId: { type: 'string' },
          role: { type: 'string' },
          weekStartDate: { type: 'string' },
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

    const { status, userId, role, weekStartDate } = request.query as {
      status?: string;
      userId?: string;
      role?: string;
      weekStartDate?: string;
    };

    let whereCondition: any = true;

    if (status) {
      whereCondition = and(whereCondition, eq(schema.shifts.status, status as any));
    }

    if (userId) {
      if (role === 'support_worker') {
        whereCondition = and(whereCondition, eq(schema.shifts.supportWorkerId, userId));
      } else if (role === 'service_provider') {
        whereCondition = and(whereCondition, eq(schema.shifts.serviceProviderId, userId));
      }
    }

    const shifts = whereCondition === true
      ? await app.db.query.shifts.findMany()
      : await app.db.query.shifts.findMany({ where: whereCondition });

    // Enrich shifts with worker names and client hours
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift: any) => {
        const workerUser = await app.db.query.user.findFirst({
          where: eq(authSchema.user.id, shift.supportWorkerId),
        });

        // Get shift notes for client information
        const shiftNotes = await app.db.query.shiftNotes.findFirst({
          where: eq(schema.shiftNotes.shiftId, shift.id),
        });

        // Calculate hours if shift has times
        let shiftHours = 0;
        if (shift.startTime && shift.endTime) {
          const duration = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
          shiftHours = duration / (1000 * 60 * 60); // Convert to hours
        }

        // Calculate weekly hours for this client if weekStartDate provided
        let weeklyClientHours = 0;
        if (weekStartDate && shiftNotes?.clientId) {
          const weekStart = new Date(weekStartDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weeklyShifts = await app.db.query.shifts.findMany({
            where: and(
              eq(schema.shifts.supportWorkerId, shift.supportWorkerId),
              eq(schema.shifts.serviceProviderId, shift.serviceProviderId),
            ),
          });

          // Filter for same client and week
          const clientWeeklyShifts = (await Promise.all(
            weeklyShifts.map(async (ws: any) => {
              const notes = await app.db.query.shiftNotes.findFirst({
                where: eq(schema.shiftNotes.shiftId, ws.id),
              });
              return { shift: ws, notes };
            }),
          )).filter(
            (item: any) =>
              item.notes?.clientId === shiftNotes.clientId &&
              new Date(item.shift.startTime) >= weekStart &&
              new Date(item.shift.startTime) < weekEnd,
          );

          for (const item of clientWeeklyShifts) {
            if (item.shift.startTime && item.shift.endTime) {
              const duration = new Date(item.shift.endTime).getTime() - new Date(item.shift.startTime).getTime();
              weeklyClientHours += duration / (1000 * 60 * 60);
            }
          }
        }

        return {
          ...shift,
          workerName: workerUser?.name || 'Unknown',
          shiftHours: parseFloat(shiftHours.toFixed(2)),
          clientName: shiftNotes?.clientName || null,
          clientId: shiftNotes?.clientId || null,
          taskDescription: shiftNotes?.taskDescription || null,
          specialRequirements: shiftNotes?.specialRequirements || null,
          weeklyClientHours: weekStartDate ? parseFloat(weeklyClientHours.toFixed(2)) : null,
        };
      }),
    );

    return enrichedShifts;
  });

  /**
   * Get shift by ID
   */
  app.fastify.get('/api/shifts/:id', {
    schema: {
      description: 'Get a shift by ID',
      tags: ['shifts'],
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

    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, id),
    });

    if (!shift) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    // Enrich with worker information and shift notes
    const workerUser = await app.db.query.user.findFirst({
      where: eq(authSchema.user.id, (shift as any).supportWorkerId),
    });

    const shiftNotes = await app.db.query.shiftNotes.findFirst({
      where: eq(schema.shiftNotes.shiftId, id),
    });

    // Calculate hours
    let shiftHours = 0;
    if ((shift as any).startTime && (shift as any).endTime) {
      const duration = new Date((shift as any).endTime).getTime() - new Date((shift as any).startTime).getTime();
      shiftHours = duration / (1000 * 60 * 60);
    }

    return {
      ...shift,
      workerName: workerUser?.name || 'Unknown',
      shiftHours: parseFloat(shiftHours.toFixed(2)),
      clientName: shiftNotes?.clientName || null,
      clientId: shiftNotes?.clientId || null,
      taskDescription: shiftNotes?.taskDescription || null,
      specialRequirements: shiftNotes?.specialRequirements || null,
      shiftNotes: shiftNotes,
    };
  });

  /**
   * Create a new shift
   */
  app.fastify.post('/api/shifts', {
    schema: {
      description: 'Create a new shift',
      tags: ['shifts'],
      body: {
        type: 'object',
        properties: {
          supportWorkerId: { type: 'string' },
          serviceProviderId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          location: { type: 'string' },
          hourlyRate: { type: 'string' },
        },
        required: ['supportWorkerId', 'serviceProviderId', 'title', 'startTime', 'endTime'],
      },
      response: {
        201: { type: 'object' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const {
      supportWorkerId,
      serviceProviderId,
      title,
      description,
      startTime,
      endTime,
      location,
      hourlyRate,
    } = request.body as any;

    const newShift = await app.db
      .insert(schema.shifts)
      .values({
        supportWorkerId,
        serviceProviderId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        hourlyRate,
      })
      .returning();

    return reply.status(201).send(newShift[0]);
  });

  /**
   * Update a shift
   */
  app.fastify.patch('/api/shifts/:id', {
    schema: {
      description: 'Update a shift',
      tags: ['shifts'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string' },
          hourlyRate: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const updates = request.body as any;

    // Convert date strings to Date objects if present
    if (updates.startTime) {
      updates.startTime = new Date(updates.startTime);
    }
    if (updates.endTime) {
      updates.endTime = new Date(updates.endTime);
    }

    const updatedShift = await app.db
      .update(schema.shifts)
      .set(updates)
      .where(eq(schema.shifts.id, id))
      .returning();

    if (updatedShift.length === 0) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    return updatedShift[0];
  });

  /**
   * Delete a shift
   */
  app.fastify.delete('/api/shifts/:id', {
    schema: {
      description: 'Delete a shift',
      tags: ['shifts'],
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
      .delete(schema.shifts)
      .where(eq(schema.shifts.id, id))
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    return reply.status(204).send();
  });

  /**
   * Get shift assignments for a shift
   */
  app.fastify.get('/api/shifts/:shiftId/assignments', {
    schema: {
      description: 'Get all assignments for a shift',
      tags: ['shifts'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      response: {
        200: { type: 'array' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };

    const assignments = await app.db.query.shiftAssignments.findMany({
      where: eq(schema.shiftAssignments.shiftId, shiftId),
    });

    return assignments;
  });

  /**
   * Assign a worker to a shift
   */
  app.fastify.post('/api/shifts/:shiftId/assignments', {
    schema: {
      description: 'Assign a support worker to a shift',
      tags: ['shifts'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          supportWorkerId: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['supportWorkerId'],
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };
    const { supportWorkerId, status = 'assigned' } = request.body as any;

    // Check if assignment already exists
    const existing = await app.db.query.shiftAssignments.findFirst({
      where: and(
        eq(schema.shiftAssignments.shiftId, shiftId),
        eq(schema.shiftAssignments.supportWorkerId, supportWorkerId),
      ),
    });

    if (existing) {
      return reply.status(400).send({ error: 'Worker already assigned to this shift' });
    }

    const assignment = await app.db
      .insert(schema.shiftAssignments)
      .values({ shiftId, supportWorkerId, status })
      .returning();

    return reply.status(201).send(assignment[0]);
  });

  /**
   * Update shift assignment status
   */
  app.fastify.patch('/api/shifts/:shiftId/assignments/:assignmentId', {
    schema: {
      description: 'Update shift assignment status',
      tags: ['shifts'],
      params: {
        type: 'object',
        properties: {
          shiftId: { type: 'string' },
          assignmentId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['assigned', 'accepted', 'declined', 'completed'] } },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { assignmentId } = request.params as { assignmentId: string };
    const { status } = request.body as { status: 'assigned' | 'accepted' | 'declined' | 'completed' };

    const updated = await app.db
      .update(schema.shiftAssignments)
      .set({ status })
      .where(eq(schema.shiftAssignments.id, assignmentId))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Assignment not found' });
    }

    return updated[0];
  });
}
