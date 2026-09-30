import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogParams {
  userId?: string;
  action: AuditAction | string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action as AuditAction,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues as object,
        newValues: params.newValues as object,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async findAll(page = 1, limit = 50, filters?: { module?: string; action?: string; userId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.module) where.module = filters.module;
    if (filters?.action) where.action = filters.action;
    if (filters?.userId) where.userId = filters.userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
