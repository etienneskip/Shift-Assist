import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerShiftNotesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Create or update shift notes
   */
  app.fastify.post('/api/shifts/:shiftId/notes', {
    schema: {
      description: 'Create or update shift notes with client information',
      tags: ['shift-notes'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          clientId: { type: 'string' },
          taskDescription: { type: 'string' },
          notes: { type: 'string' },
          specialRequirements: { type: 'string' },
        },
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };
    const { clientName, clientId, taskDescription, notes, specialRequirements } = request.body as any;

    // Verify the shift exists and user has access
    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, shiftId),
    });

    if (!shift) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    // Verify access (service provider or support worker assigned to shift)
    if (
      (shift as any).serviceProviderId !== session.user.id &&
      (shift as any).supportWorkerId !== session.user.id
    ) {
      return reply.status(403).send({ error: 'Not authorized to add notes to this shift' });
    }

    // Check if notes already exist
    const existingNotes = await app.db.query.shiftNotes.findFirst({
      where: eq(schema.shiftNotes.shiftId, shiftId),
    });

    if (existingNotes) {
      // Update existing notes
      const updated = await app.db
        .update(schema.shiftNotes)
        .set({
          clientName: clientName || (existingNotes as any).clientName,
          clientId: clientId || (existingNotes as any).clientId,
          taskDescription: taskDescription || (existingNotes as any).taskDescription,
          notes: notes || (existingNotes as any).notes,
          specialRequirements: specialRequirements || (existingNotes as any).specialRequirements,
        })
        .where(eq(schema.shiftNotes.shiftId, shiftId))
        .returning();

      return reply.status(200).send(updated[0]);
    }

    // Create new notes
    const newNotes = await app.db
      .insert(schema.shiftNotes)
      .values({
        shiftId,
        clientName,
        clientId,
        taskDescription,
        notes,
        specialRequirements,
      })
      .returning();

    return reply.status(201).send(newNotes[0]);
  });

  /**
   * Get shift notes
   */
  app.fastify.get('/api/shifts/:shiftId/notes', {
    schema: {
      description: 'Get notes for a shift',
      tags: ['shift-notes'],
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

    // Verify the shift exists and user has access
    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, shiftId),
    });

    if (!shift) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    // Verify access
    if (
      (shift as any).serviceProviderId !== session.user.id &&
      (shift as any).supportWorkerId !== session.user.id
    ) {
      return reply.status(403).send({ error: 'Not authorized to view notes for this shift' });
    }

    const notes = await app.db.query.shiftNotes.findFirst({
      where: eq(schema.shiftNotes.shiftId, shiftId),
    });

    if (!notes) {
      return reply.status(404).send({ error: 'Notes not found for this shift' });
    }

    return notes;
  });

  /**
   * Update shift notes
   */
  app.fastify.patch('/api/shifts/:shiftId/notes', {
    schema: {
      description: 'Update shift notes',
      tags: ['shift-notes'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          clientId: { type: 'string' },
          taskDescription: { type: 'string' },
          notes: { type: 'string' },
          specialRequirements: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };
    const updates = request.body as any;

    // Verify the shift exists and user has access
    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, shiftId),
    });

    if (!shift) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    // Verify access
    if (
      (shift as any).serviceProviderId !== session.user.id &&
      (shift as any).supportWorkerId !== session.user.id
    ) {
      return reply.status(403).send({ error: 'Not authorized to update notes for this shift' });
    }

    const updated = await app.db
      .update(schema.shiftNotes)
      .set(updates)
      .where(eq(schema.shiftNotes.shiftId, shiftId))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: 'Notes not found for this shift' });
    }

    return updated[0];
  });

  /**
   * Delete shift notes
   */
  app.fastify.delete('/api/shifts/:shiftId/notes', {
    schema: {
      description: 'Delete shift notes',
      tags: ['shift-notes'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      response: { 204: { type: 'null' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };

    // Verify the shift exists and user has access
    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, shiftId),
    });

    if (!shift) {
      return reply.status(404).send({ error: 'Shift not found' });
    }

    // Verify access
    if (
      (shift as any).serviceProviderId !== session.user.id &&
      (shift as any).supportWorkerId !== session.user.id
    ) {
      return reply.status(403).send({ error: 'Not authorized to delete notes for this shift' });
    }

    await app.db.delete(schema.shiftNotes).where(eq(schema.shiftNotes.shiftId, shiftId));

    return reply.status(204).send();
  });

}
