import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import * as expoService from '../services/expo.js';
import type { App } from '../index.js';

export function registerPushNotificationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Register device push token
   */
  app.fastify.post('/api/push-notifications/register', {
    schema: {
      description: 'Register a device push token for push notifications',
      tags: ['push-notifications'],
      body: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Expo push token' },
          platform: { type: 'string', enum: ['ios', 'android', 'web'], description: 'Device platform' },
        },
        required: ['token', 'platform'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            tokenId: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { token, platform } = request.body as { token: string; platform: 'ios' | 'android' | 'web' };

    if (!token || !platform) {
      return reply.status(400).send({ error: 'token and platform are required' });
    }

    // Validate token format
    if (!expoService.isValidExpoToken(token)) {
      return reply.status(400).send({ error: 'Invalid Expo push token format' });
    }

    try {
      // Check if token already exists
      const existingToken = await app.db.query.pushNotificationTokens.findFirst({
        where: eq(schema.pushNotificationTokens.token, token),
      });

      if (existingToken) {
        // Update existing token
        await app.db
          .update(schema.pushNotificationTokens)
          .set({
            isValid: true,
            updatedAt: new Date(),
          })
          .where(eq(schema.pushNotificationTokens.id, existingToken.id));

        return {
          success: true,
          message: 'Device token updated',
          tokenId: existingToken.id,
        };
      }

      // Create new token
      const result = await app.db
        .insert(schema.pushNotificationTokens)
        .values({
          userId: session.user.id,
          token,
          platform,
          isValid: true,
        })
        .returning();

      return {
        success: true,
        message: 'Device token registered',
        tokenId: (result[0] as any).id,
      };
    } catch (error) {
      console.error('Error registering device token:', error);
      return reply.status(500).send({ error: 'Failed to register device token' });
    }
  });

  /**
   * Unregister device push token
   */
  app.fastify.delete('/api/push-notifications/unregister/:userId', {
    schema: {
      description: 'Unregister a device push token (service provider only)',
      tags: ['push-notifications'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { userId } = request.params as { userId: string };

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can unregister tokens' });
    }

    try {
      // Delete all tokens for user
      await app.db
        .delete(schema.pushNotificationTokens)
        .where(eq(schema.pushNotificationTokens.userId, userId));

      return {
        success: true,
        message: 'Device token unregistered',
      };
    } catch (error) {
      console.error('Error unregistering device token:', error);
      return reply.status(500).send({ error: 'Failed to unregister device token' });
    }
  });

  /**
   * Send push notification to single user
   */
  app.fastify.post('/api/push-notifications/send', {
    schema: {
      description: 'Send a push notification to a single user (service provider only)',
      tags: ['push-notifications'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          data: { type: 'object' },
          priority: { type: 'string', enum: ['default', 'high'] },
        },
        required: ['userId', 'title', 'message'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sent: { type: 'integer' },
            failed: { type: 'integer' },
            message: { type: 'string' },
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
      return reply.status(403).send({ error: 'Only service providers can send notifications' });
    }

    const { userId, title, message, data, priority } = request.body as {
      userId: string;
      title: string;
      message: string;
      data?: Record<string, string>;
      priority?: 'default' | 'high';
    };

    if (!userId || !title || !message) {
      return reply.status(400).send({ error: 'userId, title, and message are required' });
    }

    try {
      // Get user's push tokens
      const tokens = await app.db.query.pushNotificationTokens.findMany({
        where: and(
          eq(schema.pushNotificationTokens.userId, userId),
          eq(schema.pushNotificationTokens.isValid, true),
        ),
      });

      if (tokens.length === 0) {
        return reply.status(200).send({
          success: false,
          sent: 0,
          failed: 0,
          message: 'No registered devices for this user',
        });
      }

      const tokenStrings = tokens.map((t) => (t as any).token);

      // Send notifications
      const result = await expoService.sendPushNotifications({
        tokens: tokenStrings,
        title,
        message,
        data,
        priority: priority as 'default' | 'high' | undefined,
      });

      // Handle invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ isValid: false, updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, invalidToken));
        }
      }

      // Log notification attempts and update last used time
      for (const token of tokens) {
        const tokenStr = (token as any).token;
        const isInvalidToken = result.invalidTokens?.includes(tokenStr);

        await app.db.insert(schema.pushNotificationAttempts).values({
          userId,
          token: tokenStr,
          title,
          message,
          notificationType: 'general' as any,
          status: isInvalidToken ? ('invalid_token' as any) : ('sent' as any),
          data: JSON.stringify(data || {}),
        });

        // Update last used time for valid tokens
        if (!isInvalidToken) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ lastUsedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, tokenStr));
        }
      }

      return reply.status(201).send({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        message: `Sent to ${result.sent} device(s)${result.invalidTokens?.length ? `, ${result.invalidTokens.length} invalid token(s) marked` : ''}`,
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      return reply.status(500).send({ error: 'Failed to send push notification' });
    }
  });

  /**
   * Send push notifications to multiple users
   */
  app.fastify.post('/api/push-notifications/send-bulk', {
    schema: {
      description: 'Send push notifications to multiple users (service provider only)',
      tags: ['push-notifications'],
      body: {
        type: 'object',
        properties: {
          userIds: { type: 'array', items: { type: 'string' } },
          title: { type: 'string' },
          message: { type: 'string' },
          data: { type: 'object' },
          priority: { type: 'string', enum: ['default', 'high'] },
        },
        required: ['userIds', 'title', 'message'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            totalSent: { type: 'integer' },
            totalFailed: { type: 'integer' },
            usersReached: { type: 'integer' },
            message: { type: 'string' },
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
      return reply.status(403).send({ error: 'Only service providers can send bulk notifications' });
    }

    const { userIds, title, message, data, priority } = request.body as {
      userIds: string[];
      title: string;
      message: string;
      data?: Record<string, string>;
      priority?: 'default' | 'high';
    };

    if (!userIds || userIds.length === 0 || !title || !message) {
      return reply.status(400).send({ error: 'userIds (non-empty), title, and message are required' });
    }

    try {
      // Get all tokens for the users
      const allTokens = await app.db.query.pushNotificationTokens.findMany({
        where: and(
          inArray(schema.pushNotificationTokens.userId, userIds),
          eq(schema.pushNotificationTokens.isValid, true),
        ),
      });

      if (allTokens.length === 0) {
        return reply.status(200).send({
          success: false,
          totalSent: 0,
          totalFailed: 0,
          usersReached: 0,
          message: 'No registered devices for these users',
        });
      }

      const tokenStrings = allTokens.map((t) => (t as any).token);

      // Send notifications
      const result = await expoService.sendPushNotifications({
        tokens: tokenStrings,
        title,
        message,
        data,
        priority: priority as 'default' | 'high' | undefined,
      });

      // Handle invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ isValid: false, updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, invalidToken));
        }
      }

      // Log notification attempts and update last used time
      for (const token of allTokens) {
        const tokenStr = (token as any).token;
        const isInvalidToken = result.invalidTokens?.includes(tokenStr);

        await app.db.insert(schema.pushNotificationAttempts).values({
          userId: (token as any).userId,
          token: tokenStr,
          title,
          message,
          notificationType: 'general' as any,
          status: isInvalidToken ? ('invalid_token' as any) : ('sent' as any),
          data: JSON.stringify(data || {}),
        });

        // Update last used time for valid tokens
        if (!isInvalidToken) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ lastUsedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, tokenStr));
        }
      }

      const uniqueUsers = new Set(allTokens.map((t) => (t as any).userId)).size;

      return reply.status(201).send({
        success: result.sent > 0,
        totalSent: result.sent,
        totalFailed: result.failed,
        usersReached: uniqueUsers,
        message: `Sent to ${result.sent} device(s) across ${uniqueUsers} user(s)${result.invalidTokens?.length ? `, ${result.invalidTokens.length} invalid token(s) marked` : ''}`,
      });
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      return reply.status(500).send({ error: 'Failed to send bulk push notifications' });
    }
  });

  /**
   * Send shift-specific push notification
   */
  app.fastify.post('/api/push-notifications/send-shift', {
    schema: {
      description: 'Send shift-specific push notification (service provider only)',
      tags: ['push-notifications'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          shiftId: { type: 'string' },
          notificationType: { type: 'string', enum: ['new', 'update', 'reminder'] },
          shiftTitle: { type: 'string' },
          startTime: { type: 'string' },
        },
        required: ['userId', 'shiftId', 'notificationType', 'shiftTitle', 'startTime'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sent: { type: 'integer' },
            failed: { type: 'integer' },
            message: { type: 'string' },
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
      return reply.status(403).send({ error: 'Only service providers can send shift notifications' });
    }

    const { userId, shiftId, notificationType, shiftTitle, startTime } = request.body as {
      userId: string;
      shiftId: string;
      notificationType: 'new' | 'update' | 'reminder';
      shiftTitle: string;
      startTime: string;
    };

    try {
      // Get user's push tokens
      const tokens = await app.db.query.pushNotificationTokens.findMany({
        where: and(
          eq(schema.pushNotificationTokens.userId, userId),
          eq(schema.pushNotificationTokens.isValid, true),
        ),
      });

      if (tokens.length === 0) {
        return reply.status(200).send({
          success: false,
          sent: 0,
          failed: 0,
          message: 'No registered devices for this user',
        });
      }

      // Generate message based on notification type
      let title = '';
      let message = '';
      let priority: 'default' | 'high' = 'default';

      switch (notificationType) {
        case 'new':
          title = 'New Shift Assigned';
          message = `You have been assigned to: ${shiftTitle}`;
          break;
        case 'update':
          title = 'Shift Updated';
          message = `Your shift "${shiftTitle}" has been updated`;
          priority = 'high';
          break;
        case 'reminder':
          title = 'Shift Reminder';
          message = `Reminder: ${shiftTitle} starting at ${startTime}`;
          priority = 'high';
          break;
      }

      const tokenStrings = tokens.map((t) => (t as any).token);

      // Send notifications
      const result = await expoService.sendPushNotifications({
        tokens: tokenStrings,
        title,
        message,
        data: {
          shiftId,
          notificationType,
        },
        priority,
      });

      // Handle invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ isValid: false, updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, invalidToken));
        }
      }

      // Log notification attempts and update last used time
      for (const token of tokens) {
        const tokenStr = (token as any).token;
        const isInvalidToken = result.invalidTokens?.includes(tokenStr);

        await app.db.insert(schema.pushNotificationAttempts).values({
          userId,
          token: tokenStr,
          title,
          message,
          notificationType: notificationType as any,
          status: isInvalidToken ? ('invalid_token' as any) : ('sent' as any),
          data: JSON.stringify({ shiftId, notificationType }),
        });

        // Update last used time for valid tokens
        if (!isInvalidToken) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ lastUsedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, tokenStr));
        }
      }

      return reply.status(201).send({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        message: `Shift notification sent to ${result.sent} device(s)${result.invalidTokens?.length ? `, ${result.invalidTokens.length} invalid token(s) marked` : ''}`,
      });
    } catch (error) {
      console.error('Error sending shift notification:', error);
      return reply.status(500).send({ error: 'Failed to send shift notification' });
    }
  });

  /**
   * Get all push tokens for a user
   */
  app.fastify.get('/api/push-notifications/tokens/:userId', {
    schema: {
      description: 'Get all push notification tokens for a user (service provider only)',
      tags: ['push-notifications'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tokens: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  token: { type: 'string' },
                  platform: { type: 'string' },
                  isValid: { type: 'boolean' },
                  lastUsedAt: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { userId } = request.params as { userId: string };

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can view tokens' });
    }

    try {
      const tokens = await app.db.query.pushNotificationTokens.findMany({
        where: eq(schema.pushNotificationTokens.userId, userId),
      });

      return {
        success: true,
        tokens: tokens.map((t) => ({
          id: (t as any).id,
          token: (t as any).token,
          platform: (t as any).platform,
          isValid: (t as any).isValid,
          lastUsedAt: (t as any).lastUsedAt,
          createdAt: (t as any).createdAt,
          updatedAt: (t as any).updatedAt,
        })),
        message: `Retrieved ${tokens.length} token(s) for user`,
      };
    } catch (error) {
      console.error('Error retrieving push tokens:', error);
      return reply.status(500).send({ error: 'Failed to retrieve push tokens' });
    }
  });

  /**
   * Delete a specific push token
   */
  app.fastify.delete('/api/push-notifications/tokens/:tokenId', {
    schema: {
      description: 'Delete a specific push notification token (service provider only)',
      tags: ['push-notifications'],
      params: {
        type: 'object',
        properties: {
          tokenId: { type: 'string' },
        },
        required: ['tokenId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { tokenId } = request.params as { tokenId: string };

    // Verify user is a service provider
    const userRole = await app.db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, session.user.id),
        eq(schema.userRoles.role, 'service_provider' as any),
      ),
    });

    if (!userRole) {
      return reply.status(403).send({ error: 'Only service providers can delete tokens' });
    }

    try {
      // Get the token first to verify it exists
      const token = await app.db.query.pushNotificationTokens.findFirst({
        where: eq(schema.pushNotificationTokens.id, tokenId),
      });

      if (!token) {
        return reply.status(404).send({ error: 'Token not found' });
      }

      // Delete the token
      await app.db
        .delete(schema.pushNotificationTokens)
        .where(eq(schema.pushNotificationTokens.id, tokenId));

      return {
        success: true,
        message: 'Push token deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting push token:', error);
      return reply.status(500).send({ error: 'Failed to delete push token' });
    }
  });

  /**
   * Send document expiry alert
   */
  app.fastify.post('/api/push-notifications/send-document-expiry', {
    schema: {
      description: 'Send document expiry alert notification (service provider only)',
      tags: ['push-notifications'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          documentName: { type: 'string' },
          daysRemaining: { type: 'integer' },
          documentType: { type: 'string' },
        },
        required: ['userId', 'documentName', 'daysRemaining'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sent: { type: 'integer' },
            failed: { type: 'integer' },
            message: { type: 'string' },
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
      return reply.status(403).send({ error: 'Only service providers can send document expiry alerts' });
    }

    const { userId, documentName, daysRemaining, documentType } = request.body as {
      userId: string;
      documentName: string;
      daysRemaining: number;
      documentType?: string;
    };

    if (!userId || !documentName || daysRemaining === undefined) {
      return reply.status(400).send({ error: 'userId, documentName, and daysRemaining are required' });
    }

    try {
      // Get user's push tokens
      const tokens = await app.db.query.pushNotificationTokens.findMany({
        where: and(
          eq(schema.pushNotificationTokens.userId, userId),
          eq(schema.pushNotificationTokens.isValid, true),
        ),
      });

      if (tokens.length === 0) {
        return reply.status(200).send({
          success: false,
          sent: 0,
          failed: 0,
          message: 'No registered devices for this user',
        });
      }

      // Generate message based on days remaining
      let title = '';
      let message = '';
      let priority: 'default' | 'high' = 'default';

      if (daysRemaining <= 0) {
        title = 'Document Expired';
        message = `${documentName} has expired. Please renew immediately.`;
        priority = 'high';
      } else if (daysRemaining <= 7) {
        title = 'Document Expiring Soon';
        message = `${documentName} expires in ${daysRemaining} day(s). Please renew soon.`;
        priority = 'high';
      } else if (daysRemaining <= 30) {
        title = 'Document Expiry Notice';
        message = `${documentName} expires in ${daysRemaining} days.`;
      } else {
        title = 'Document Expiry Reminder';
        message = `Reminder: ${documentName} expires in ${daysRemaining} days.`;
      }

      const tokenStrings = tokens.map((t) => (t as any).token);

      // Send notifications
      const result = await expoService.sendPushNotifications({
        tokens: tokenStrings,
        title,
        message,
        data: {
          documentName,
          daysRemaining: daysRemaining.toString(),
          documentType: documentType || '',
        },
        priority,
      });

      // Handle invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ isValid: false, updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, invalidToken));
        }
      }

      // Log notification attempts and update last used time
      for (const token of tokens) {
        const tokenStr = (token as any).token;
        const isInvalidToken = result.invalidTokens?.includes(tokenStr);

        await app.db.insert(schema.pushNotificationAttempts).values({
          userId,
          token: tokenStr,
          title,
          message,
          notificationType: 'document' as any,
          status: isInvalidToken ? ('invalid_token' as any) : ('sent' as any),
          data: JSON.stringify({
            documentName,
            daysRemaining,
            documentType: documentType || '',
          }),
        });

        // Update last used time for valid tokens
        if (!isInvalidToken) {
          await app.db
            .update(schema.pushNotificationTokens)
            .set({ lastUsedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.pushNotificationTokens.token, tokenStr));
        }
      }

      return reply.status(201).send({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        message: `Document expiry alert sent to ${result.sent} device(s)${result.invalidTokens?.length ? `, ${result.invalidTokens.length} invalid token(s) marked` : ''}`,
      });
    } catch (error) {
      console.error('Error sending document expiry alert:', error);
      return reply.status(500).send({ error: 'Failed to send document expiry alert' });
    }
  });
}
