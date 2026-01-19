import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Geocoding helper using Google Maps Geocoding API
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not set, geocoding skipped');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`,
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }

    const data: any = await response.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function registerClientRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * List all clients for authenticated service provider
   */
  app.fastify.get('/api/clients', {
    schema: {
      description: 'Get all clients for authenticated service provider',
      tags: ['clients'],
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

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can access clients' });
    }

    const clients = await app.db.query.clients.findMany({
      where: eq(schema.clients.serviceProviderId, session.user.id),
    });

    // Sort by creation date (most recent first)
    const sortedClients = (clients as any[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return sortedClients;
  });

  /**
   * Get single client by ID
   */
  app.fastify.get('/api/clients/:id', {
    schema: {
      description: 'Get a single client by ID',
      tags: ['clients'],
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

    const client = await app.db.query.clients.findFirst({
      where: eq(schema.clients.id, id),
    });

    if (!client) {
      return reply.status(404).send({ error: 'Client not found' });
    }

    // Verify ownership
    if ((client as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to access this client' });
    }

    return client;
  });

  /**
   * Create new client with address geocoding
   */
  app.fastify.post('/api/clients', {
    schema: {
      description: 'Create a new client with address geocoding',
      tags: ['clients'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['name', 'address'],
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can create clients' });
    }

    const { name, address, phone, email, notes } = request.body as any;

    // Geocode the address
    const coordinates = await geocodeAddress(address);

    const newClient = await app.db
      .insert(schema.clients)
      .values({
        serviceProviderId: session.user.id,
        name,
        address,
        phone,
        email,
        notes,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
      })
      .returning();

    return reply.status(201).send(newClient[0]);
  });

  /**
   * Update client
   */
  app.fastify.put('/api/clients/:id', {
    schema: {
      description: 'Update a client (with optional address re-geocoding)',
      tags: ['clients'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const { name, address, phone, email, notes } = request.body as any;

    const client = await app.db.query.clients.findFirst({
      where: eq(schema.clients.id, id),
    });

    if (!client) {
      return reply.status(404).send({ error: 'Client not found' });
    }

    // Verify ownership
    if ((client as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to update this client' });
    }

    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (notes !== undefined) updates.notes = notes;

    // If address is being updated, re-geocode it
    if (address !== undefined && address !== (client as any).address) {
      updates.address = address;
      const coordinates = await geocodeAddress(address);
      if (coordinates) {
        updates.latitude = coordinates.latitude;
        updates.longitude = coordinates.longitude;
      }
    }

    const updated = await app.db
      .update(schema.clients)
      .set(updates)
      .where(eq(schema.clients.id, id))
      .returning();

    return updated[0];
  });

  /**
   * Delete client
   */
  app.fastify.delete('/api/clients/:id', {
    schema: {
      description: 'Delete a client',
      tags: ['clients'],
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

    const client = await app.db.query.clients.findFirst({
      where: eq(schema.clients.id, id),
    });

    if (!client) {
      return reply.status(404).send({ error: 'Client not found' });
    }

    // Verify ownership
    if ((client as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to delete this client' });
    }

    await app.db.delete(schema.clients).where(eq(schema.clients.id, id));

    return reply.status(204).send();
  });

  /**
   * Get static map image URL for a client location
   */
  app.fastify.get('/api/clients/:id/map', {
    schema: {
      description: 'Get a static map image URL for a client location',
      tags: ['clients'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          width: { type: 'integer' },
          height: { type: 'integer' },
          zoom: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const { width = 600, height = 400, zoom = 15 } = request.query as {
      width?: number;
      height?: number;
      zoom?: number;
    };

    const client = await app.db.query.clients.findFirst({
      where: eq(schema.clients.id, id),
    });

    if (!client) {
      return reply.status(404).send({ error: 'Client not found' });
    }

    // Verify ownership
    if ((client as any).serviceProviderId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to access this client' });
    }

    // Check if client has coordinates
    if (!(client as any).latitude || !(client as any).longitude) {
      return reply.status(400).send({ error: 'Client address has not been geocoded' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: 'Google Maps API key not configured' });
    }

    // Build static maps URL
    const mapUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
    mapUrl.searchParams.set('center', `${(client as any).latitude},${(client as any).longitude}`);
    mapUrl.searchParams.set('zoom', zoom.toString());
    mapUrl.searchParams.set('size', `${width}x${height}`);
    mapUrl.searchParams.set('markers', `color:red|${(client as any).latitude},${(client as any).longitude}`);
    mapUrl.searchParams.set('key', apiKey);

    return {
      url: mapUrl.toString(),
      latitude: (client as any).latitude,
      longitude: (client as any).longitude,
    };
  });

  /**
   * Get all clients with map data (coordinates)
   */
  app.fastify.get('/api/clients-map', {
    schema: {
      description: 'Get all clients with geocoded coordinates for map display',
      tags: ['clients'],
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

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can access clients' });
    }

    const clients = await app.db.query.clients.findMany({
      where: eq(schema.clients.serviceProviderId, session.user.id),
    });

    // Filter only clients with coordinates
    const clientsWithCoordinates = (clients as any[]).filter(
      (c) => c.latitude !== null && c.longitude !== null,
    );

    // Sort by creation date (most recent first)
    const sortedClients = clientsWithCoordinates.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return sortedClients;
  });

  /**
   * Batch geocode clients without coordinates
   */
  app.fastify.post('/api/clients/batch-geocode', {
    schema: {
      description: 'Geocode all clients that are missing coordinates',
      tags: ['clients'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalClients: { type: 'integer' },
            geocodedClients: { type: 'integer' },
            failedClients: { type: 'integer' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can geocode clients' });
    }

    const clients = await app.db.query.clients.findMany({
      where: eq(schema.clients.serviceProviderId, session.user.id),
    });

    let geocodedCount = 0;
    let failedCount = 0;

    for (const client of clients as any[]) {
      // Skip if already has coordinates
      if (client.latitude && client.longitude) {
        continue;
      }

      const coordinates = await geocodeAddress(client.address);

      if (coordinates) {
        await app.db
          .update(schema.clients)
          .set({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          })
          .where(eq(schema.clients.id, client.id));

        geocodedCount++;
      } else {
        failedCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      totalClients: clients.length,
      geocodedClients: geocodedCount,
      failedClients: failedCount,
    };
  });
}
