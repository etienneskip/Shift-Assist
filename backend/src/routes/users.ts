import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Get current user profile
   */
  app.fastify.get('/api/users/me', {
    schema: {
      description: 'Get current user profile',
      tags: ['users'],
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            roles: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userRoles = await app.db.query.userRoles.findMany({
      where: eq(schema.userRoles.userId, session.user.id),
    });

    return { user: session.user, roles: userRoles };
  });

  /**
   * Get all users (support workers and service providers)
   */
  app.fastify.get('/api/users', {
    schema: {
      description: 'Get all users with their roles',
      tags: ['users'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              roles: { type: 'array' },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    // Get all user roles
    const allUserRoles = await app.db.query.userRoles.findMany();

    // Group roles by userId
    const rolesByUserId = new Map<string, any[]>();
    for (const role of allUserRoles) {
      const userId = (role as any).userId;
      if (!rolesByUserId.has(userId)) {
        rolesByUserId.set(userId, []);
      }
      rolesByUserId.get(userId)!.push((role as any).role);
    }

    return Array.from(rolesByUserId.entries()).map(([userId, roles]) => ({
      id: userId,
      roles: roles,
    }));
  });

  /**
   * Assign role to user
   */
  app.fastify.post('/api/users/:userId/roles', {
    schema: {
      description: 'Assign a role to a user',
      tags: ['users'],
      params: {
        type: 'object',
        properties: { userId: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: { role: { type: 'string', enum: ['support_worker', 'service_provider'] } },
      },
      response: {
        200: { type: 'object' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { userId } = request.params as { userId: string };
    const { role } = request.body as { role: 'support_worker' | 'service_provider' };

    // Check if role already exists
    const existingRole = await app.db.query.userRoles.findFirst({
      where: eq(
        schema.userRoles.userId,
        userId,
      ),
    });

    if (existingRole && existingRole.role === role) {
      return reply.status(400).send({ error: 'Role already assigned' });
    }

    const newRole = await app.db.insert(schema.userRoles).values({
      userId,
      role,
    }).returning();

    return newRole[0];
  });

  /**
   * Get users by role
   */
  app.fastify.get('/api/users/roles/:role', {
    schema: {
      description: 'Get all users with a specific role',
      tags: ['users'],
      params: {
        type: 'object',
        properties: { role: { type: 'string', enum: ['support_worker', 'service_provider'] } },
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

    const { role } = request.params as { role: 'support_worker' | 'service_provider' };

    const usersWithRole = await app.db.query.userRoles.findMany({
      where: eq(schema.userRoles.role, role),
    });

    return usersWithRole;
  });

  /**
   * Remove role from user
   */
  app.fastify.delete('/api/users/:userId/roles/:role', {
    schema: {
      description: 'Remove a role from a user',
      tags: ['users'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          role: { type: 'string', enum: ['support_worker', 'service_provider'] },
        },
      },
      response: { 204: { type: 'null' } },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { userId, role } = request.params as { userId: string; role: 'support_worker' | 'service_provider' };

    await app.db
      .delete(schema.userRoles)
      .where(
        eq(schema.userRoles.userId, userId) && eq(schema.userRoles.role, role),
      );

    return reply.status(204).send();
  });
}
