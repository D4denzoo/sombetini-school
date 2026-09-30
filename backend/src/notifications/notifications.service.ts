import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private messaging: MessagingService,
  ) {}

  async findByUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount } };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Arifa haijapatikana');
    if (notification.userId !== userId) throw new ForbiddenException('Huna ruhusa');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Arifa zote zimesomwa' };
  }

  async create(data: { userId: string; type: NotificationType; title: string; message: string; data?: Record<string, unknown> }) {
    return this.messaging.notifyUser(data);
  }

  /**
   * Saves the in-app notice for every recipient at once and hands email/SMS to the queue.
   * Returns immediately; delivery progress is visible in /health under queues.
   */
  async createBulk(userIds: string[], notification: { type: NotificationType; title: string; message: string; data?: Record<string, unknown> }) {
    const result = await this.messaging.notifyUsers(userIds, notification);
    this.logger.log(`notice queued recipients=${result.recipients} delivery=${result.queued ? 'email/sms' : 'in-app only'}`);
    return {
      message: result.queued
        ? 'Notice saved. Email and SMS copies are being sent in the background.'
        : 'Notice saved in the portal. Connect email or SMS to send copies outside the school.',
      recipients: result.recipients,
      queued: result.queued,
      messaging: this.messaging.status(),
    };
  }

  /** Sends one notice to everyone holding the given roles (e.g. all parents). */
  async broadcast(roleNames: string[], notification: { type: NotificationType; title: string; message: string; data?: Record<string, unknown> }) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: 'ACTIVE', roles: { some: { role: { name: { in: roleNames } } } } },
      select: { id: true },
    });
    return this.createBulk(users.map((user) => user.id), notification);
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Arifa haijapatikana');
    if (notification.userId !== userId) throw new ForbiddenException('Huna ruhusa');

    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Arifa imefutwa' };
  }
}
