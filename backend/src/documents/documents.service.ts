import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findPublic(page = 1, limit = 20, category?: string) {
    const cacheKey = `documents:public:${page}:${limit}:${category || 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = { isPublished: true };
    if (category) where.category = category as DocumentCategory;

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    const result = { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Hati haijapatikana');
    return doc;
  }

  async findPublished(id: string) {
    const doc = await this.findOne(id);
    if (!doc.isPublished) throw new NotFoundException('Hati haijapatikana');
    return doc;
  }

  async download(id: string) {
    const doc = await this.findPublished(id);
    await this.prisma.document.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    return doc;
  }

  async findAllAdmin(page = 1, limit = 20, category?: string) {
    const where = category ? { category: category as DocumentCategory } : {};
    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(data: {
    title: string; description?: string; category: string;
    fileName: string; fileUrl: string; fileSize: number; mimeType: string; isPublished?: boolean;
  }) {
    const doc = await this.prisma.document.create({
      data: {
        ...data,
        category: data.category as DocumentCategory,
        publishedAt: data.isPublished !== false ? new Date() : undefined,
      },
    });
    await this.redis.delPattern('documents:*');
    return doc;
  }

  async update(id: string, data: Partial<{
    title: string; description: string; category: string; isPublished: boolean;
  }>) {
    await this.findOne(id);
    const updateData = { ...data } as Record<string, unknown>;
    if (data.isPublished === true) updateData.publishedAt = new Date();
    const doc = await this.prisma.document.update({ where: { id }, data: updateData as never });
    await this.redis.delPattern('documents:*');
    return doc;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    await this.redis.delPattern('documents:*');
    return { message: 'Hati imefutwa' };
  }
}
