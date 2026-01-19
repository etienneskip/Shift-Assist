import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import * as onesignalService from '../services/onesignal.js';
import type { App } from '../index.js';

export function registerNotificationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Register device for push notifications
   */
  app.fastify.post('/api/notifications/register-device', {
    schema: {
      description: 'Register a device for push notifications',
      tags: ['notifications'],
      body: {
        type: 'object',
        properties: {
          playerId: { type: 'string' },
        },
        required: ['playerId'],
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

    const { playerId } = request.body as { playerId: string };

    if (!playerId) {
      return reply.status(400).send({ error: 'playerId is required' });
    }

    try {
      // Update user with OneSignal player ID
      await app.db
        .update(authSchema.user)
        .set({ onesignalPlayerId: playerId })
        .where(eq(authSchema.user.id, session.user.id));

      return {
        success: true,
        message: 'Device registered successfully',
      };
    } catch (error) {
      console.error('Error registering device:', error);
      return reply.status(500).send({ error: 'Failed to register device' });
    }
  });

  /**
   * Send push notification to a single user
   */
  app.fastify.post('/api/notifications/send', {
    schema: {
      description: 'Send a push notification to a single user (service provider only)',
      tags: ['notifications'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['shift', 'document', 'timesheet', 'general'] },
          data: { type: 'object' },
        },
        required: ['userId', 'title', 'message', 'type'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            notificationId: { type: 'string' },
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

    const { userId, title, message, type, data } = request.body as {
      userId: string;
      title: string;
      message: string;
      type: 'shift' | 'document' | 'timesheet' | 'general';
      data?: Record<string, string>;
    };

    try {
      // Log notification
      const notificationLog = await app.db
        .insert(schema.notificationLogs)
        .values({
          userId,
          title,
          message,
          type,
          read: false,
        })
        .returning();

      // Get user's OneSignal player ID
      const targetUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.id, userId),
      });

      // Send push notification if user has registered device
      let pushSent = false;
      if (targetUser && (targetUser as any).onesignalPlayerId) {
        pushSent = await onesignalService.sendPushNotification({
          userId,
          headings: { en: title },
          contents: { en: message },
          data: {
            notificationType: type,
            notificationId: (notificationLog[0] as any).id,
            ...data,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        notificationId: (notificationLog[0] as any).id,
        message: pushSent ? 'Notification sent to device and logged' : 'Notification logged (device not registered)',
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      return reply.status(500).send({ error: 'Failed to send notification' });
    }
  });

  /**
   * Send bulk push notifications
   */
  app.fastify.post('/api/notifications/send-bulk', {
    schema: {
      description: 'Send push notifications to multiple users (service provider only)',
      tags: ['notifications'],
      body: {
        type: 'object',
        properties: {
          userIds: {
            type: 'array',
            items: { type: 'string' },
          },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['shift', 'document', 'timesheet', 'general'] },
          data: { type: 'object' },
        },
        required: ['userIds', 'title', 'message', 'type'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sentCount: { type: 'integer' },
            loggedCount: { type: 'integer' },
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

    const { userIds, title, message, type, data } = request.body as {
      userIds: string[];
      title: string;
      message: string;
      type: 'shift' | 'document' | 'timesheet' | 'general';
      data?: Record<string, string>;
    };

    if (!userIds || userIds.length === 0) {
      return reply.status(400).send({ error: 'At least one user ID is required' });
    }

    try {
      let loggedCount = 0;

      // Log notifications for all users
      for (const userId of userIds) {
        await app.db
          .insert(schema.notificationLogs)
          .values({
            userId,
            title,
            message,
            type,
            read: false,
          });
        loggedCount++;
      }

      // Send push notifications via OneSignal
      const { sent } = await onesignalService.sendBulkPushNotifications(
        userIds,
        title,
        message,
        {
          notificationType: type,
          ...data,
        },
      );

      return reply.status(201).send({
        success: true,
        sentCount: sent,
        loggedCount,
      });
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return reply.status(500).send({ error: 'Failed to send bulk notifications' });
    }
  });

  /**
   * Send shift-related notification
   */
  app.fastify.post('/api/notifications/send-shift-notification', {
    schema: {
      description: 'Send shift-related notification (new, update, or reminder)',
      tags: ['notifications'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          shiftId: { type: 'string' },
          notificationType: { type: 'string', enum: ['new', 'update', 'reminder'] },
          shiftTitle: { type: 'string' },
          shiftTime: { type: 'string' },
        },
        required: ['userId', 'shiftId', 'notificationType', 'shiftTitle', 'shiftTime'],
      },
      response: {
        201: { type: 'object' },
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

    const { userId, shiftId, notificationType, shiftTitle, shiftTime } = request.body as {
      userId: string;
      shiftId: string;
      notificationType: 'new' | 'update' | 'reminder';
      shiftTitle: string;
      shiftTime: string;
    };

    try {
      let titleText = '';
      let messageText = '';

      switch (notificationType) {
        case 'new':
          titleText = 'New Shift Assigned';
          messageText = `You have been assigned to: ${shiftTitle} at ${shiftTime}`;
          break;
        case 'update':
          titleText = 'Shift Updated';
          messageText = `${shiftTitle} has been updated. Check details at ${shiftTime}`;
          break;
        case 'reminder':
          titleText = 'Shift Reminder';
          messageText = `Reminder: ${shiftTitle} is coming up at ${shiftTime}`;
          break;
      }

      // Log notification
      const notificationLog = await app.db
        .insert(schema.notificationLogs)
        .values({
          userId,
          title: titleText,
          message: messageText,
          type: 'shift',
          read: false,
        })
        .returning();

      // Get user and send push notification
      const targetUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.id, userId),
      });

      let pushSent = false;
      if (targetUser && (targetUser as any).onesignalPlayerId) {
        pushSent = await onesignalService.sendPushNotification({
          userId,
          headings: { en: titleText },
          contents: { en: messageText },
          data: {
            notificationType: 'shift',
            shiftId,
            shiftNotificationType: notificationType,
            notificationId: (notificationLog[0] as any).id,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        notificationId: (notificationLog[0] as any).id,
        pushSent,
      });
    } catch (error) {
      console.error('Error sending shift notification:', error);
      return reply.status(500).send({ error: 'Failed to send shift notification' });
    }
  });

  /**
   * Send document expiry alert
   */
  app.fastify.post('/api/notifications/send-document-expiry', {
    schema: {
      description: 'Send document expiry alert to a user',
      tags: ['notifications'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          documentName: { type: 'string' },
          daysUntilExpiry: { type: 'integer' },
        },
        required: ['userId', 'documentName', 'daysUntilExpiry'],
      },
      response: {
        201: { type: 'object' },
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
      return reply.status(403).send({ error: 'Only service providers can send document alerts' });
    }

    const { userId, documentName, daysUntilExpiry } = request.body as {
      userId: string;
      documentName: string;
      daysUntilExpiry: number;
    };

    try {
      const titleText = `${documentName} Expiring Soon`;
      const messageText =
        daysUntilExpiry === 0
          ? `${documentName} expires today! Please renew immediately.`
          : `${documentName} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew soon.`;

      // Log notification
      const notificationLog = await app.db
        .insert(schema.notificationLogs)
        .values({
          userId,
          title: titleText,
          message: messageText,
          type: 'document',
          read: false,
        })
        .returning();

      // Get user and send push notification
      const targetUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.id, userId),
      });

      let pushSent = false;
      if (targetUser && (targetUser as any).onesignalPlayerId) {
        pushSent = await onesignalService.sendPushNotification({
          userId,
          headings: { en: titleText },
          contents: { en: messageText },
          data: {
            notificationType: 'document',
            daysUntilExpiry: daysUntilExpiry.toString(),
            notificationId: (notificationLog[0] as any).id,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        notificationId: (notificationLog[0] as any).id,
        pushSent,
      });
    } catch (error) {
      console.error('Error sending document expiry alert:', error);
      return reply.status(500).send({ error: 'Failed to send document expiry alert' });
    }
  });

  /**
   * Get all notifications for authenticated user
   */
  app.fastify.get('/api/notifications', {
    schema: {
      description: 'Get all notifications for the authenticated user',
      tags: ['notifications'],
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

    const notifications = await app.db.query.notificationLogs.findMany({
      where: eq(schema.notificationLogs.userId, session.user.id),
    });

    // Sort by createdAt DESC
    const sortedNotifications = (notifications as any[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return sortedNotifications;
  });

  /**
   * Mark notification as read
   */
  app.fastify.patch('/api/notifications/:id/read', {
    schema: {
      description: 'Mark a notification as read',
      tags: ['notifications'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    const notification = await app.db.query.notificationLogs.findFirst({
      where: eq(schema.notificationLogs.id, id),
    });

    if (!notification) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    // Verify ownership
    if ((notification as any).userId !== session.user.id) {
      return reply.status(403).send({ error: 'Not authorized to update this notification' });
    }

    await app.db
      .update(schema.notificationLogs)
      .set({ read: true })
      .where(eq(schema.notificationLogs.id, id));

    return { success: true };
  });


  /**
   * Get unread notification count
   */
  app.fastify.get('/api/notifications/unread/count', {
    schema: {
      description: 'Get count of unread notifications for the authenticated user',
      tags: ['notifications'],
      response: {
        200: {
          type: 'object',
          properties: { count: { type: 'integer' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const notifications = await app.db.query.notificationLogs.findMany({
      where: and(
        eq(schema.notificationLogs.userId, session.user.id),
        eq(schema.notificationLogs.read, false),
      ),
    });

    return { count: notifications.length };
  });

  /**
   * Mark all notifications as read
   */
  app.fastify.patch('/api/notifications/mark-all-read', {
    schema: {
      description: 'Mark all notifications as read for the authenticated user',
      tags: ['notifications'],
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' }, updatedCount: { type: 'integer' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const unreadNotifications = await app.db.query.notificationLogs.findMany({
      where: and(
        eq(schema.notificationLogs.userId, session.user.id),
        eq(schema.notificationLogs.read, false),
      ),
    });

    const updatePromises = (unreadNotifications as any[]).map((notification) =>
      app.db
        .update(schema.notificationLogs)
        .set({ read: true })
        .where(eq(schema.notificationLogs.id, notification.id)),
    );

    await Promise.all(updatePromises);

    return {
      success: true,
      updatedCount: unreadNotifications.length,
    };
  });

}
