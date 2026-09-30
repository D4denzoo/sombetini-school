import { Injectable, NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    page?: number; limit?: number; resourceType?: string; subjectId?: string;
    classLevel?: number; topic?: string; isPublished?: boolean;
  } = {}) {
    const { page = 1, limit = 20, resourceType, subjectId, classLevel, topic, isPublished = true } = filters;
    const where: Record<string, unknown> = { isPublished };
    if (resourceType) where.resourceType = resourceType as ResourceType;
    if (subjectId) where.subjectId = subjectId;
    if (classLevel) where.classLevel = classLevel;
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.learningResource.findMany({
        where,
        include: { subject: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningResource.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const resource = await this.prisma.learningResource.findUnique({
      where: { id },
      include: { subject: true },
    });
    if (!resource) throw new NotFoundException('Rasilimali haijapatikana');
    return resource;
  }

  async download(id: string) {
    const resource = await this.findOne(id);
    await this.prisma.learningResource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    return resource;
  }

  async create(data: {
    title: string; description?: string; resourceType: string; subjectId?: string;
    classLevel?: number; topic?: string; academicYear?: string;
    fileName?: string; fileUrl?: string; externalUrl?: string;
    fileSize?: number; mimeType?: string; isPublished?: boolean;
  }) {
    return this.prisma.learningResource.create({
      data: { ...data, resourceType: data.resourceType as ResourceType },
      include: { subject: true },
    });
  }

  async update(id: string, data: Partial<{
    title: string; description: string; resourceType: string; subjectId: string;
    classLevel: number; topic: string; academicYear: string;
    fileName: string; fileUrl: string; externalUrl: string; isPublished: boolean;
  }>) {
    await this.findOne(id);
    return this.prisma.learningResource.update({
      where: { id },
      data: data as never,
      include: { subject: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.learningResource.delete({ where: { id } });
    return { message: 'Rasilimali imefutwa' };
  }
}
