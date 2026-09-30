import { Injectable, NotFoundException } from '@nestjs/common';
import { GalleryCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findAlbums(page = 1, limit = 20, category?: string) {
    const cacheKey = `gallery:albums:${page}:${limit}:${category || 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = { isPublished: true };
    if (category) where.category = category as GalleryCategory;

    const [data, total] = await Promise.all([
      this.prisma.galleryAlbum.findMany({
        where,
        include: { _count: { select: { images: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.galleryAlbum.count({ where }),
    ]);

    const result = { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  async findAlbum(id: string) {
    const album = await this.prisma.galleryAlbum.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!album) throw new NotFoundException('Albamu haijapatikana');
    return album;
  }

  async findPublishedAlbum(id: string) {
    const album = await this.findAlbum(id);
    if (!album.isPublished) throw new NotFoundException('Albamu haijapatikana');
    return album;
  }

  async findAllAdmin(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.galleryAlbum.findMany({
        include: { _count: { select: { images: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.galleryAlbum.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createAlbum(data: { title: string; description?: string; category: string; coverUrl?: string; isPublished?: boolean; sortOrder?: number }) {
    const album = await this.prisma.galleryAlbum.create({
      data: { ...data, category: data.category as GalleryCategory },
    });
    await this.redis.delPattern('gallery:*');
    return album;
  }

  async updateAlbum(id: string, data: Partial<{ title: string; description: string; category: string; coverUrl: string; isPublished: boolean; sortOrder: number }>) {
    await this.findAlbum(id);
    const album = await this.prisma.galleryAlbum.update({ where: { id }, data: data as never });
    await this.redis.delPattern('gallery:*');
    return album;
  }

  async removeAlbum(id: string) {
    await this.findAlbum(id);
    await this.prisma.galleryAlbum.delete({ where: { id } });
    await this.redis.delPattern('gallery:*');
    return { message: 'Albamu imefutwa' };
  }

  async addImage(albumId: string, data: { title?: string; imageUrl: string; thumbnailUrl?: string; sortOrder?: number }) {
    await this.findAlbum(albumId);
    return this.prisma.galleryImage.create({ data: { albumId, ...data } });
  }

  async removeImage(imageId: string) {
    await this.prisma.galleryImage.delete({ where: { id: imageId } });
    await this.redis.delPattern('gallery:*');
    return { message: 'Picha imefutwa' };
  }
}
