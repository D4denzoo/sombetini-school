import { Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findPublic(page = 1, limit = 10, category?: string) {
    const cacheKey = `announcements:public:${page}:${limit}:${category || 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const where = {
      status: AnnouncementStatus.PUBLISHED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(category ? { category: category as never } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const result = { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    await this.redis.set(cacheKey, result, 120);
    return result;
  }

  async findBySlug(slug: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { slug },
      include: {
        author: { select: { firstName: true, lastName: true } },
        attachments: true,
      },
    });

    if (!announcement || announcement.status !== 'PUBLISHED') {
      throw new NotFoundException('Tangazo halipatikani');
    }
    if (announcement.expiresAt && announcement.expiresAt < new Date()) {
      throw new NotFoundException('Tangazo halipatikani');
    }

    await this.prisma.announcement.update({
      where: { id: announcement.id },
      data: { viewCount: { increment: 1 } },
    });

    return announcement;
  }

  async create(data: {
    title: string; description: string; category: string;
    featuredImage?: string; authorId: string; expiresAt?: Date; scheduledAt?: Date;
  }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const announcement = await this.prisma.announcement.create({
      data: {
        ...data,
        slug: `${slug}-${Date.now()}`,
        category: data.category as never,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });
    await this.redis.delPattern('announcements:*');
    return announcement;
  }

  async publish(id: string) {
    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.redis.delPattern('announcements:*');
    return announcement;
  }

  async update(id: string, data: Partial<{ title: string; description: string; category: string; featuredImage: string; expiresAt: Date }>) {
    const announcement = await this.prisma.announcement.update({ where: { id }, data: data as never });
    await this.redis.delPattern('announcements:*');
    return announcement;
  }

  async remove(id: string) {
    await this.prisma.announcement.delete({ where: { id } });
    await this.redis.delPattern('announcements:*');
    return { message: 'Tangazo limefutwa' };
  }

  async findAllAdmin(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as AnnouncementStatus } : {};
    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
