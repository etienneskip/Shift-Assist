import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerComplianceDocumentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Upload compliance document
   */
  app.fastify.post('/api/compliance-documents/upload', {
    schema: {
      description: 'Upload a compliance document',
      tags: ['compliance-documents'],
      consumes: ['multipart/form-data'],
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    const options = { limits: { fileSize: 50 * 1024 * 1024 } }; // 50MB limit
    let buffer: Buffer;

    try {
      buffer = await data.toBuffer();
    } catch (err) {
      return reply.status(413).send({ error: 'File too large' });
    }

    const { documentName, documentType, serviceProviderId, expiryDate } = request.headers as any;

    if (!serviceProviderId || !documentType) {
      return reply.status(400).send({ error: 'Missing required fields: serviceProviderId, documentType' });
    }

    // Verify the user is a support worker assigned to the provider
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, session.user.id),
        eq(schema.workerProviderRelationships.serviceProviderId, serviceProviderId),
      ),
    });

    if (!relationship) {
      return reply.status(403).send({ error: 'Not assigned to this service provider' });
    }

    const timestamp = Date.now();
    const key = `compliance/${serviceProviderId}/${session.user.id}/${timestamp}-${data.filename}`;

    const uploadedKey = await app.storage.upload(key, buffer);

    const newDocument = await app.db
      .insert(schema.complianceDocuments)
      .values({
        supportWorkerId: session.user.id,
        serviceProviderId: serviceProviderId as string,
        documentName: documentName || data.filename,
        documentType: documentType as any,
        storageKey: uploadedKey,
        expiryDate: expiryDate ? new Date(expiryDate as string) : null,
      })
      .returning();

    const { url } = await app.storage.getSignedUrl(uploadedKey);

    return reply.status(201).send({
      ...newDocument[0],
      url,
    });
  });

  /**
   * Get compliance documents for a worker (service provider view)
   */
  app.fastify.get('/api/compliance-documents/worker/:workerId', {
    schema: {
      description: 'Get compliance documents for a support worker',
      tags: ['compliance-documents'],
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

    // Verify the user is a service provider with this worker
    const relationship = await app.db.query.workerProviderRelationships.findFirst({
      where: and(
        eq(schema.workerProviderRelationships.supportWorkerId, workerId),
        eq(schema.workerProviderRelationships.serviceProviderId, session.user.id),
      ),
    });

    if (!relationship) {
      return reply.status(403).send({ error: 'Worker not assigned to this provider' });
    }

    const documents = await app.db.query.complianceDocuments.findMany({
      where: and(
        eq(schema.complianceDocuments.supportWorkerId, workerId),
        eq(schema.complianceDocuments.serviceProviderId, session.user.id),
      ),
    });

    // Generate signed URLs for all documents
    const docsWithUrls = await Promise.all(
      documents.map(async (doc: any) => {
        const { url } = await app.storage.getSignedUrl(doc.storageKey);
        return { ...doc, url };
      }),
    );

    return docsWithUrls;
  });

  /**
   * Get my compliance documents (support worker view)
   */
  app.fastify.get('/api/compliance-documents/my', {
    schema: {
      description: 'Get my compliance documents',
      tags: ['compliance-documents'],
      querystring: {
        type: 'object',
        properties: {
          serviceProviderId: { type: 'string' },
          status: { type: 'string', enum: ['valid', 'expiring_soon', 'expired'] },
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

    const { serviceProviderId, status } = request.query as { serviceProviderId?: string; status?: string };

    let whereCondition: any = eq(schema.complianceDocuments.supportWorkerId, session.user.id);

    if (serviceProviderId) {
      whereCondition = and(whereCondition, eq(schema.complianceDocuments.serviceProviderId, serviceProviderId));
    }

    if (status) {
      whereCondition = and(whereCondition, eq(schema.complianceDocuments.status, status as any));
    }

    const documents = await app.db.query.complianceDocuments.findMany({
      where: whereCondition,
    });

    // Generate signed URLs for all documents
    const docsWithUrls = await Promise.all(
      documents.map(async (doc: any) => {
        const { url } = await app.storage.getSignedUrl(doc.storageKey);
        return { ...doc, url };
      }),
    );

    return docsWithUrls;
  });

  /**
   * Update compliance document expiry and status
   */
  app.fastify.patch('/api/compliance-documents/:documentId', {
    schema: {
      description: 'Update compliance document',
      tags: ['compliance-documents'],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          expiryDate: { type: 'string' },
          status: { type: 'string', enum: ['valid', 'expiring_soon', 'expired'] },
          documentName: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { documentId } = request.params as { documentId: string };
    const { expiryDate, status, documentName } = request.body as any;

    const document = await app.db.query.complianceDocuments.findFirst({
      where: eq(schema.complianceDocuments.id, documentId),
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    // Verify ownership
    if ((document as any).supportWorkerId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to update this document' });
    }

    const updates: any = {};
    if (expiryDate !== undefined) updates.expiryDate = new Date(expiryDate);
    if (status !== undefined) updates.status = status;
    if (documentName !== undefined) updates.documentName = documentName;

    const updated = await app.db
      .update(schema.complianceDocuments)
      .set(updates)
      .where(eq(schema.complianceDocuments.id, documentId))
      .returning();

    return updated[0];
  });

  /**
   * Delete compliance document
   */
  app.fastify.delete('/api/compliance-documents/:documentId', {
    schema: {
      description: 'Delete a compliance document',
      tags: ['compliance-documents'],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
      },
      response: { 204: { type: 'null' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { documentId } = request.params as { documentId: string };

    const document = await app.db.query.complianceDocuments.findFirst({
      where: eq(schema.complianceDocuments.id, documentId),
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    // Verify ownership or provider access
    if ((document as any).supportWorkerId !== session.user.id && (document as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to delete this document' });
    }

    // Delete from storage
    await app.storage.delete((document as any).storageKey);

    // Delete from database
    await app.db.delete(schema.complianceDocuments).where(eq(schema.complianceDocuments.id, documentId));

    return reply.status(204).send();
  });

  /**
   * Get compliance document download URL
   */
  app.fastify.get('/api/compliance-documents/:documentId/url', {
    schema: {
      description: 'Get signed URL for compliance document',
      tags: ['compliance-documents'],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            expiresAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { documentId } = request.params as { documentId: string };

    const document = await app.db.query.complianceDocuments.findFirst({
      where: eq(schema.complianceDocuments.id, documentId),
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    // Verify access
    if ((document as any).supportWorkerId !== session.user.id && (document as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to access this document' });
    }

    const { url, expiresAt } = await app.storage.getSignedUrl((document as any).storageKey);

    return { url, expiresAt };
  });
}
