import { Injectable, NotFoundException } from '@nestjs/common';
import { EventCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findPublic(page = 1, limit = 20, category?: string, from?: Date, to?: Date) {
    const cacheKey = `events:public:${page}:${limit}:${category || 'all'}:${from?.toISOString() || ''}:${to?.toISOString() || ''}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = { isPublished: true };
    if (category) where.category = category as EventCategory;
    if (from || to) {
      where.startDate = {};
      if (from) (where.startDate as Record<string, Date>).gte = from;
      if (to) (where.startDate as Record<string, Date>).lte = to;
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    const result = { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    await this.redis.set(cacheKey, result, 120);
    return result;
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Tukio halipatikani');
    return event;
  }

  async findPublished(id: string) {
    const event = await this.findOne(id);
    if (!event.isPublished) throw new NotFoundException('Tukio halipatikani');
    return event;
  }

  async findAllAdmin(page = 1, limit = 20, category?: string) {
    const where = category ? { category: category as EventCategory } : {};
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(data: {
    title: string; description?: string; category: string;
    startDate: Date; endDate?: Date; location?: string;
    isAllDay?: boolean; isRecurring?: boolean; recurrenceRule?: string; isPublished?: boolean;
  }) {
    const event = await this.prisma.event.create({
      data: { ...data, category: data.category as EventCategory },
    });
    await this.redis.delPattern('events:*');
    return event;
  }

  async update(id: string, data: Partial<{
    title: string; description: string; category: string; startDate: Date; endDate: Date;
    location: string; isAllDay: boolean; isRecurring: boolean; recurrenceRule: string; isPublished: boolean;
  }>) {
    await this.findOne(id);
    const event = await this.prisma.event.update({ where: { id }, data: data as never });
    await this.redis.delPattern('events:*');
    return event;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.event.delete({ where: { id } });
    await this.redis.delPattern('events:*');
    return { message: 'Tukio limefutwa' };
  }
}
