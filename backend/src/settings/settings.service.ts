import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private messaging: MessagingService,
    private config: ConfigService,
  ) {}

  async getPublicSettings() {
    const cacheKey = 'settings:public:v3';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [settings, leadership, stats] = await Promise.all([
      this.prisma.schoolSettings.findFirst(),
      this.prisma.schoolLeadership.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, name: true, position: true, positionSw: true, photoUrl: true,
          welcomeMessage: true, biography: true, sortOrder: true, isHead: true, isActive: true,
        },
      }),
      this.getStats(),
    ]);

    const { isSetupComplete: _hidden, ...publicSettings } = settings || {};
    const provider = (this.config.get<string>('PAYMENT_PROVIDER') || 'mock').trim().toLowerCase();
    const paymentsLive = provider !== 'mock' && Boolean(this.config.get<string>('PAYMENT_API_KEY')?.trim());
    const result = {
      settings: settings ? publicSettings : null,
      leadership,
      stats,
      platform: { paymentsMode: paymentsLive ? 'live' : 'mock' },
    };
    await this.redis.set(cacheKey, result, 600);
    return result;
  }

  async getSettings() {
    const settings = await this.prisma.schoolSettings.findFirst();
    if (!settings) {
      return this.prisma.schoolSettings.create({ data: {} });
    }
    return settings;
  }

  async updateSettings(data: Record<string, unknown>) {
    const existing = await this.getSettings();
    const allowed = [
      'schoolName', 'schoolNameSw', 'motto', 'vision', 'mission', 'coreValues', 'history',
      'academicPhilosophy', 'achievements', 'logoUrl', 'primaryColor', 'secondaryColor', 'accentColor',
      'address', 'postalAddress', 'phone', 'phone2', 'email', 'emergencyPhone', 'workingHours',
      'mapEmbedUrl', 'facebookUrl', 'instagramUrl', 'youtubeUrl', 'twitterUrl', 'whatsappNumber',
      'showFacebook', 'showInstagram', 'showYoutube', 'showTwitter', 'showWhatsapp', 'yearsOfService',
    ];
    const clean = Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
    const settings = await this.prisma.schoolSettings.update({
      where: { id: existing.id },
      data: clean,
    });
    await this.redis.delPattern('settings:*');
    return settings;
  }

  async getStats() {
    const cacheKey = 'stats:dynamic';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [studentCount, teacherCount, parentCount, classCount, activeYear] = await Promise.all([
      this.prisma.student.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.teacher.count({ where: { isActive: true } }),
      this.prisma.parent.count(),
      this.prisma.class.count({ where: { isActive: true } }),
      this.prisma.academicYear.findFirst({ where: { isCurrent: true } }),
    ]);

    const stats = {
      studentCount,
      teacherCount,
      parentCount,
      classCount,
      currentAcademicYear: activeYear?.name || null,
      generatedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, stats, 300);
    return stats;
  }

  // Leadership CRUD
  async findPublicLeadership() {
    return this.prisma.schoolLeadership.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, position: true, positionSw: true, photoUrl: true,
        welcomeMessage: true, biography: true, sortOrder: true, isHead: true,
      },
    });
  }

  async findAllLeadership() {
    return this.prisma.schoolLeadership.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findPublicLeader(id: string) {
    const leader = await this.prisma.schoolLeadership.findFirst({
      where: { id, isActive: true },
      select: {
        id: true, name: true, position: true, positionSw: true, photoUrl: true,
        welcomeMessage: true, biography: true, sortOrder: true, isHead: true,
      },
    });
    if (!leader) throw new NotFoundException('Kiongozi hajapatikana');
    return leader;
  }

  async findLeadership(id: string) {
    const leader = await this.prisma.schoolLeadership.findUnique({ where: { id } });
    if (!leader) throw new NotFoundException('Kiongozi hajapatikana');
    return leader;
  }

  async createLeadership(data: {
    name: string; position: string; positionSw?: string; photoUrl?: string;
    welcomeMessage?: string; biography?: string; email?: string; phone?: string;
    sortOrder?: number; isHead?: boolean; isActive?: boolean;
  }) {
    const leader = await this.prisma.schoolLeadership.create({ data });
    await this.redis.delPattern('settings:*');
    return leader;
  }

  async updateLeadership(id: string, data: Partial<{
    name: string; position: string; positionSw: string; photoUrl: string;
    welcomeMessage: string; biography: string; email: string; phone: string;
    sortOrder: number; isHead: boolean; isActive: boolean;
  }>) {
    await this.findLeadership(id);
    const leader = await this.prisma.schoolLeadership.update({ where: { id }, data });
    await this.redis.delPattern('settings:*');
    return leader;
  }

  async createContactMessage(data: { name: string; email: string; phone?: string; subject: string; message: string }) {
    const saved = await this.prisma.contactMessage.create({ data });

    const settings = await this.prisma.schoolSettings.findFirst();
    const officeEmail = settings?.email?.trim();
    if (officeEmail && this.messaging.status().email.configured) {
      try {
        await this.messaging.sendEmail(
          officeEmail,
          `Contact form: ${data.subject}`,
          `From: ${data.name} <${data.email}>${data.phone ? `\nPhone: ${data.phone}` : ''}\n\n${data.message}`,
        );
      } catch (error) {
        this.logger.warn(`Contact email to office failed: ${error instanceof Error ? error.message : error}`);
      }
    }

    if (this.messaging.status().email.configured) {
      try {
        await this.messaging.sendEmail(
          data.email,
          'Sombetini Primary School received your message',
          `Habari ${data.name},\n\nThe school office has your message about "${data.subject}". Someone will reply during working hours.\n\nSombetini Primary School`,
        );
      } catch (error) {
        this.logger.warn(`Contact acknowledgement failed: ${error instanceof Error ? error.message : error}`);
      }
    }

    return { message: 'Message received. The school office will reply during working hours.', id: saved.id };
  }

  async removeLeadership(id: string) {
    await this.findLeadership(id);
    await this.prisma.schoolLeadership.delete({ where: { id } });
    await this.redis.delPattern('settings:*');
    return { message: 'Kiongozi amefutwa' };
  }
}
