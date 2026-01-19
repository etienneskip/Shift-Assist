import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerDocumentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Get all documents (with optional filtering)
   */
  app.fastify.get('/api/documents', {
    schema: {
      description: 'Get all documents',
      tags: ['documents'],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          userId: { type: 'string' },
          shiftId: { type: 'string' },
          timesheetId: { type: 'string' },
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

    const { type, userId, shiftId, timesheetId } = request.query as {
      type?: string;
      userId?: string;
      shiftId?: string;
      timesheetId?: string;
    };

    let whereCondition: any = true;

    if (type) {
      whereCondition = and(whereCondition, eq(schema.documents.documentType, type as any));
    }

    if (userId) {
      whereCondition = and(whereCondition, eq(schema.documents.uploadedBy, userId));
    }

    if (shiftId) {
      whereCondition = and(whereCondition, eq(schema.documents.shiftId, shiftId));
    }

    if (timesheetId) {
      whereCondition = and(whereCondition, eq(schema.documents.timesheetId, timesheetId));
    }

    const documents = whereCondition === true
      ? await app.db.query.documents.findMany()
      : await app.db.query.documents.findMany({ where: whereCondition });

    return documents;
  });

  /**
   * Get document by ID
   */
  app.fastify.get('/api/documents/:id', {
    schema: {
      description: 'Get a document by ID',
      tags: ['documents'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fileName: { type: 'string' },
            fileType: { type: 'string' },
            storageKey: { type: 'string' },
            url: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const document = await app.db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    // Generate signed URL for the document
    const { url } = await app.storage.getSignedUrl(document.storageKey);

    return { ...document, url };
  });

  /**
   * Upload a document
   */
  app.fastify.post('/api/documents/upload', {
    schema: {
      description: 'Upload a document',
      tags: ['documents'],
      consumes: ['multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fileName: { type: 'string' },
            url: { type: 'string' },
            storageKey: { type: 'string' },
          },
        },
      },
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

    // Extract form fields
    const fields = await request.file();

    // Generate storage key
    const timestamp = Date.now();
    const key = `documents/${session.user.id}/${timestamp}-${data.filename}`;

    // Upload to storage
    const uploadedKey = await app.storage.upload(key, buffer);

    // Create document record in database
    const newDocument = await app.db
      .insert(schema.documents)
      .values({
        uploadedBy: session.user.id,
        fileName: data.filename,
        fileType: data.mimetype,
        storageKey: uploadedKey,
        fileSize: buffer.length,
        documentType: 'other',
      })
      .returning();

    // Generate signed URL
    const { url } = await app.storage.getSignedUrl(uploadedKey);

    return reply.status(201).send({
      id: newDocument[0].id,
      fileName: newDocument[0].fileName,
      fileType: newDocument[0].fileType,
      url,
      storageKey: uploadedKey,
    });
  });

  /**
   * Upload document for a shift
   */
  app.fastify.post('/api/shifts/:shiftId/documents', {
    schema: {
      description: 'Upload a document for a shift',
      tags: ['documents'],
      params: {
        type: 'object',
        properties: { shiftId: { type: 'string' } },
      },
      consumes: ['multipart/form-data'],
      response: {
        201: { type: 'object' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { shiftId } = request.params as { shiftId: string };

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch (err) {
      return reply.status(413).send({ error: 'File too large' });
    }

    const timestamp = Date.now();
    const key = `documents/shifts/${shiftId}/${timestamp}-${data.filename}`;

    const uploadedKey = await app.storage.upload(key, buffer);

    const newDocument = await app.db
      .insert(schema.documents)
      .values({
        uploadedBy: session.user.id,
        shiftId,
        fileName: data.filename,
        fileType: data.mimetype,
        storageKey: uploadedKey,
        fileSize: buffer.length,
        documentType: 'proof',
      })
      .returning();

    const { url } = await app.storage.getSignedUrl(uploadedKey);

    return reply.status(201).send({
      ...newDocument[0],
      url,
    });
  });

  /**
   * Upload document for a timesheet
   */
  app.fastify.post('/api/timesheets/:timesheetId/documents', {
    schema: {
      description: 'Upload a document for a timesheet',
      tags: ['documents'],
      params: {
        type: 'object',
        properties: { timesheetId: { type: 'string' } },
      },
      consumes: ['multipart/form-data'],
      response: {
        201: { type: 'object' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { timesheetId } = request.params as { timesheetId: string };

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch (err) {
      return reply.status(413).send({ error: 'File too large' });
    }

    const timestamp = Date.now();
    const key = `documents/timesheets/${timesheetId}/${timestamp}-${data.filename}`;

    const uploadedKey = await app.storage.upload(key, buffer);

    const newDocument = await app.db
      .insert(schema.documents)
      .values({
        uploadedBy: session.user.id,
        timesheetId,
        fileName: data.filename,
        fileType: data.mimetype,
        storageKey: uploadedKey,
        fileSize: buffer.length,
        documentType: 'invoice',
      })
      .returning();

    const { url } = await app.storage.getSignedUrl(uploadedKey);

    return reply.status(201).send({
      ...newDocument[0],
      url,
    });
  });

  /**
   * Get signed URL for a document
   */
  app.fastify.get('/api/documents/:id/url', {
    schema: {
      description: 'Get signed URL for a document',
      tags: ['documents'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
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

    const { id } = request.params as { id: string };

    const document = await app.db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const { url, expiresAt } = await app.storage.getSignedUrl(document.storageKey);

    return { url, expiresAt };
  });

  /**
   * Delete a document
   */
  app.fastify.delete('/api/documents/:id', {
    schema: {
      description: 'Delete a document',
      tags: ['documents'],
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

    const document = await app.db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    // Delete from storage
    await app.storage.delete(document.storageKey);

    // Delete from database
    await app.db.delete(schema.documents).where(eq(schema.documents.id, id));

    return reply.status(204).send();
  });

  /**
   * Get all documents for a shift
   */
  app.fastify.get('/api/shifts/:shiftId/documents', {
    schema: {
      description: 'Get all documents for a shift',
      tags: ['documents'],
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

    const documents = await app.db.query.documents.findMany({
      where: eq(schema.documents.shiftId, shiftId),
    });

    // Generate signed URLs for all documents
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const { url } = await app.storage.getSignedUrl(doc.storageKey);
        return { ...doc, url };
      }),
    );

    return docsWithUrls;
  });

  /**
   * Get all documents for a timesheet
   */
  app.fastify.get('/api/timesheets/:timesheetId/documents', {
    schema: {
      description: 'Get all documents for a timesheet',
      tags: ['documents'],
      params: {
        type: 'object',
        properties: { timesheetId: { type: 'string' } },
      },
      response: {
        200: { type: 'array' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { timesheetId } = request.params as { timesheetId: string };

    const documents = await app.db.query.documents.findMany({
      where: eq(schema.documents.timesheetId, timesheetId),
    });

    // Generate signed URLs for all documents
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const { url } = await app.storage.getSignedUrl(doc.storageKey);
        return { ...doc, url };
      }),
    );

    return docsWithUrls;
  });
}
