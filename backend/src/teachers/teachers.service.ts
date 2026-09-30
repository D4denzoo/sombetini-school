import { ForbiddenException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findAll(page = 1, limit = 20, search?: string, isActive?: boolean) {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { staffNo: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true } },
          assignments: { where: { isActive: true }, include: { class: true, subject: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user?: AuthUser) {
    this.assertOwnTeacher(id, user);
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true } },
        assignments: { include: { class: true, subject: true } },
      },
    });
    if (!teacher) throw new NotFoundException('Mwalimu hajapatikana');
    return teacher;
  }

  async create(data: { userId: string; staffNo: string; qualification?: string; specialization?: string; joinDate: Date }) {
    const existing = await this.prisma.teacher.findUnique({ where: { userId: data.userId } });
    if (existing) throw new ConflictException('Mtumiaji huyu tayari ni mwalimu');

    const teacher = await this.prisma.teacher.create({
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    await this.redis.delPattern('stats:*');
    return teacher;
  }

  async update(id: string, data: Partial<{ qualification: string; specialization: string; isActive: boolean }>) {
    await this.findOne(id);
    return this.prisma.teacher.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true } } },
    });
  }

  private assertOwnTeacher(id: string, user?: AuthUser) {
    if (!user) return;
    const staff = user.roles.some((role) =>
      [RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.ACADEMIC_ADMIN].includes(role as RoleName),
    );
    if (staff) return;
    if (user.roles.includes(RoleName.TEACHER) && user.teacherId !== id) {
      throw new ForbiddenException('Huna ruhusa ya kuona wasifu wa mwalimu mwingine');
    }
  }

  async assignToClass(teacherId: string, classId: string, subjectId: string) {
    await this.findOne(teacherId);
    return this.prisma.teacherAssignment.upsert({
      where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
      create: { teacherId, classId, subjectId },
      update: { isActive: true },
      include: { class: true, subject: true },
    });
  }

  async removeAssignment(assignmentId: string) {
    return this.prisma.teacherAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });
  }

  async getAssignments(teacherId: string, user?: AuthUser) {
    const teacher = await this.findOne(teacherId, user);
    return teacher.assignments;
  }
}
