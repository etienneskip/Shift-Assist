import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import type { App } from '../index.js';

export function registerPayslipRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Generate payslip from timesheets
   */
  app.fastify.post('/api/payslips/generate', {
    schema: {
      description: 'Generate a payslip from timesheets for a pay period',
      tags: ['payslips'],
      body: {
        type: 'object',
        properties: {
          supportWorkerId: { type: 'string' },
          payPeriodStartDate: { type: 'string' },
          payPeriodEndDate: { type: 'string' },
          hourlyRate: { type: 'string' },
          deductions: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['supportWorkerId', 'payPeriodStartDate', 'payPeriodEndDate', 'hourlyRate'],
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { supportWorkerId, payPeriodStartDate, payPeriodEndDate, hourlyRate, deductions = '0', notes } = request.body as any;

    // Verify service provider can create payslips for this worker
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, supportWorkerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(403).send({ error: 'Worker not assigned to this provider' });
    }

    const startDate = new Date(payPeriodStartDate);
    const endDate = new Date(payPeriodEndDate);

    // Get all approved timesheets for the period
    const timesheets = await app.db.query.timesheets.findMany({
      where: and(
        eq(schema.timesheets.supportWorkerId, supportWorkerId),
        eq(schema.timesheets.status, 'approved' as any),
      ),
    });

    // Filter by date range
    const periodTimesheets = timesheets.filter((ts: any) => {
      const tsDate = new Date(ts.startTime);
      return tsDate >= startDate && tsDate <= endDate;
    });

    // Calculate total hours
    let totalHours = 0;
    for (const ts of periodTimesheets) {
      if ((ts as any).totalHours) {
        totalHours += parseFloat((ts as any).totalHours.toString());
      }
    }

    const rate = parseFloat(hourlyRate);
    const grossPay = totalHours * rate;
    const deductionsAmount = parseFloat(deductions);
    const netPay = grossPay - deductionsAmount;

    // Create payslip
    const newPayslip = await app.db
      .insert(schema.payslips)
      .values({
        supportWorkerId,
        serviceProviderId: session.user.id,
        payPeriodStartDate: startDate,
        payPeriodEndDate: endDate,
        totalHours: totalHours.toString(),
        hourlyRate: hourlyRate,
        grossPay: grossPay.toString(),
        deductions: deductions,
        netPay: netPay.toString(),
        notes,
        status: 'draft',
      })
      .returning();

    // Create payslip line items
    if (periodTimesheets.length > 0) {
      await app.db
        .insert(schema.payslipItems)
        .values({
          payslipId: newPayslip[0].id,
          itemType: 'shift_hours' as const,
          description: `Hours worked (${periodTimesheets.length} shifts)`,
          quantity: totalHours.toString(),
          rate: hourlyRate,
          amount: grossPay.toString(),
        });
    }

    if (deductionsAmount > 0) {
      await app.db
        .insert(schema.payslipItems)
        .values({
          payslipId: newPayslip[0].id,
          itemType: 'deduction' as const,
          description: 'Deductions',
          amount: deductions,
        });
    }

    return reply.status(201).send(newPayslip[0]);
  });

  /**
   * Get all payslips (with filtering for service provider)
   */
  app.fastify.get('/api/payslips', {
    schema: {
      description: 'Get payslips',
      tags: ['payslips'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'issued', 'paid'] },
          workerId: { type: 'string' },
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

    const { status, workerId } = request.query as { status?: string; workerId?: string };

    let whereCondition: any = eq(schema.payslips.serviceProviderId, session.user.id);

    if (status) {
      whereCondition = and(whereCondition, eq(schema.payslips.status, status as any));
    }

    if (workerId) {
      whereCondition = and(whereCondition, eq(schema.payslips.supportWorkerId, workerId));
    }

    const payslips = await app.db.query.payslips.findMany({
      where: whereCondition,
    });

    // Enrich payslips with worker information
    const enrichedPayslips = await Promise.all(
      payslips.map(async (payslip: any) => {
        const workerUser = await app.db.query.user.findFirst({
          where: eq(authSchema.user.id, payslip.supportWorkerId),
        });
        return {
          ...payslip,
          workerName: workerUser?.name || 'Unknown',
          workerEmail: workerUser?.email || 'Unknown',
        };
      }),
    );

    return enrichedPayslips;
  });

  /**
   * Get payslip details with line items
   */
  app.fastify.get('/api/payslips/:payslipId', {
    schema: {
      description: 'Get payslip details with line items',
      tags: ['payslips'],
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

    if (!payslip) {
      return reply.status(404).send({ error: 'Payslip not found' });
    }

    // Verify access (service provider or support worker)
    if ((payslip as any).serviceProviderId !== session.user.id && (payslip as any).supportWorkerId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to access this payslip' });
    }

    const items = await app.db.query.payslipItems.findMany({
      where: eq(schema.payslipItems.payslipId, payslipId),
    });

    // Get worker information
    const workerUser = await app.db.query.user.findFirst({
      where: eq(authSchema.user.id, (payslip as any).supportWorkerId),
    });

    return {
      payslip: {
        ...payslip,
        workerName: workerUser?.name || 'Unknown',
        workerEmail: workerUser?.email || 'Unknown',
      },
      items,
    };
  });

  /**
   * Update payslip (draft status only)
   */
  app.fastify.patch('/api/payslips/:payslipId', {
    schema: {
      description: 'Update a payslip (draft status only)',
      tags: ['payslips'],
      params: {
        type: 'object',
        properties: { payslipId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          hourlyRate: { type: 'string' },
          deductions: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { payslipId } = request.params as { payslipId: string };
    const { hourlyRate, deductions, notes } = request.body as any;

    const payslip = await app.db.query.payslips.findFirst({
      where: eq(schema.payslips.id, payslipId),
    });

    if (!payslip) {
      return reply.status(404).send({ error: 'Payslip not found' });
    }

    // Verify service provider owns this payslip
    if ((payslip as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to update this payslip' });
    }

    // Only draft payslips can be updated
    if ((payslip as any).status !== 'draft') {
      return reply.status(400).send({ error: 'Can only update draft payslips' });
    }

    const updates: any = {};
    if (hourlyRate !== undefined) {
      updates.hourlyRate = hourlyRate;
      // Recalculate gross and net pay
      const totalHours = parseFloat((payslip as any).totalHours.toString());
      const rate = parseFloat(hourlyRate);
      updates.grossPay = (totalHours * rate).toString();
      const ded = deductions !== undefined ? parseFloat(deductions) : parseFloat((payslip as any).deductions.toString());
      updates.netPay = (totalHours * rate - ded).toString();
    }
    if (deductions !== undefined) {
      updates.deductions = deductions;
      // Recalculate net pay
      const rate = hourlyRate !== undefined ? parseFloat(hourlyRate) : parseFloat((payslip as any).hourlyRate.toString());
      const totalHours = parseFloat((payslip as any).totalHours.toString());
      updates.netPay = (totalHours * rate - parseFloat(deductions)).toString();
    }
    if (notes !== undefined) updates.notes = notes;

    const updated = await app.db
      .update(schema.payslips)
      .set(updates)
      .where(eq(schema.payslips.id, payslipId))
      .returning();

    return updated[0];
  });

  /**
   * Issue a payslip (change status from draft to issued)
   */
  app.fastify.post('/api/payslips/:payslipId/issue', {
    schema: {
      description: 'Issue a payslip (draft to issued)',
      tags: ['payslips'],
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

    if (!payslip) {
      return reply.status(404).send({ error: 'Payslip not found' });
    }

    // Verify service provider owns this payslip
    if ((payslip as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to issue this payslip' });
    }

    if ((payslip as any).status !== 'draft') {
      return reply.status(400).send({ error: 'Only draft payslips can be issued' });
    }

    const updated = await app.db
      .update(schema.payslips)
      .set({ status: 'issued', issuedDate: new Date() })
      .where(eq(schema.payslips.id, payslipId))
      .returning();

    return updated[0];
  });

  /**
   * Mark payslip as paid
   */
  app.fastify.post('/api/payslips/:payslipId/mark-paid', {
    schema: {
      description: 'Mark a payslip as paid',
      tags: ['payslips'],
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

    if (!payslip) {
      return reply.status(404).send({ error: 'Payslip not found' });
    }

    // Verify service provider owns this payslip
    if ((payslip as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to mark this payslip as paid' });
    }

    if ((payslip as any).status !== 'issued') {
      return reply.status(400).send({ error: 'Only issued payslips can be marked as paid' });
    }

    const updated = await app.db
      .update(schema.payslips)
      .set({ status: 'paid', paidDate: new Date() })
      .where(eq(schema.payslips.id, payslipId))
      .returning();

    return updated[0];
  });

  /**
   * Delete a payslip (draft only)
   */
  app.fastify.delete('/api/payslips/:payslipId', {
    schema: {
      description: 'Delete a payslip (draft status only)',
      tags: ['payslips'],
      params: {
        type: 'object',
        properties: { payslipId: { type: 'string' } },
      },
      response: { 204: { type: 'null' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { payslipId } = request.params as { payslipId: string };

    const payslip = await app.db.query.payslips.findFirst({
      where: eq(schema.payslips.id, payslipId),
    });

    if (!payslip) {
      return reply.status(404).send({ error: 'Payslip not found' });
    }

    // Verify service provider owns this payslip
    if ((payslip as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to delete this payslip' });
    }

    if ((payslip as any).status !== 'draft') {
      return reply.status(400).send({ error: 'Can only delete draft payslips' });
    }

    // Delete line items first
    await app.db.delete(schema.payslipItems).where(eq(schema.payslipItems.payslipId, payslipId));

    // Delete payslip
    await app.db.delete(schema.payslips).where(eq(schema.payslips.id, payslipId));

    return reply.status(204).send();
  });

  /**
   * Get payslip summary for a worker
   */
  app.fastify.get('/api/payslips/summary/:workerId', {
    schema: {
      description: 'Get payslip summary for a worker',
      tags: ['payslips'],
      params: {
        type: 'object',
        properties: { workerId: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalPayslips: { type: 'integer' },
            totalPaid: { type: 'number' },
            totalPending: { type: 'number' },
            lastPayslip: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { workerId } = request.params as { workerId: string };

    // Service provider accessing worker data
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, workerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(403).send({ error: 'Worker not assigned to this provider' });
    }

    const payslips = await app.db.query.payslips.findMany({
      where: and(
        eq(schema.payslips.supportWorkerId, workerId),
        eq(schema.payslips.serviceProviderId, session.user.id),
      ),
    });

    let totalPaid = 0;
    let totalPending = 0;

    for (const ps of payslips) {
      const amount = parseFloat((ps as any).netPay.toString());
      if ((ps as any).status === 'paid') {
        totalPaid += amount;
      } else if ((ps as any).status === 'issued') {
        totalPending += amount;
      }
    }

    const lastPayslip = payslips.length > 0 ? payslips[payslips.length - 1] : null;

    return {
      totalPayslips: payslips.length,
      totalPaid,
      totalPending,
      lastPayslip,
    };
  });
}
