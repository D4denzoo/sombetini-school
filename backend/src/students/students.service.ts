import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Gender, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findAll(page = 1, limit = 20, search?: string, classId?: string, status?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (classId) where.classId = classId;
    if (status) where.status = status as StudentStatus;
    if (search) {
      where.OR = [
        { registrationNo: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        select: {
          id: true, registrationNo: true, firstName: true, lastName: true, gender: true,
          status: true, classId: true, admissionDate: true, photoUrl: true,
          class: { select: { id: true, name: true, level: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByRegistrationNo(registrationNo: string) {
    const student = await this.prisma.student.findFirst({
      where: { registrationNo, deletedAt: null },
      select: {
        id: true, registrationNo: true, firstName: true, lastName: true, gender: true,
        status: true, classId: true, photoUrl: true,
        class: { select: { id: true, name: true, level: true, section: true } },
      },
    });
    if (!student) throw new NotFoundException('Mwanafunzi hajapatikana');
    return student;
  }

  async findOne(id: string, user?: AuthUser) {
    if (user?.roles.includes(RoleName.PARENT) && !this.isStaff(user)) {
      if (!user.parentId) throw new ForbiddenException('Huna ruhusa ya kuona mwanafunzi huyu');
      const link = await this.prisma.parentStudent.findFirst({
        where: { parentId: user.parentId, studentId: id, status: 'APPROVED' },
      });
      if (!link) throw new ForbiddenException('Huna ruhusa ya kuona mwanafunzi huyu');
    }

    const admin = !!user && this.isAdmin(user);
    const student = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
      include: {
        class: true,
        ...(admin ? {
          parents: { include: { parent: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } } } },
        } : {}),
      },
    });
    if (!student) throw new NotFoundException('Mwanafunzi hajapatikana');

    const ownChild = !!user?.roles.includes(RoleName.PARENT) && !this.isStaff(user);
    if (!admin && !ownChild) {
      const { medicalNotes: _medicalNotes, bloodGroup: _bloodGroup, address: _address, ...safe } = student;
      return safe;
    }
    return student;
  }

  private isAdmin(user: AuthUser) {
    return user.roles.some((role) =>
      [RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.ACADEMIC_ADMIN].includes(role as RoleName),
    );
  }

  private isStaff(user: AuthUser) {
    return user.roles.some((role) =>
      [RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.TEACHER].includes(role as RoleName),
    );
  }

  async create(data: {
    registrationNo: string; firstName: string; lastName: string; gender: Gender;
    dateOfBirth: Date; classId: string; admissionDate: Date;
    photoUrl?: string; address?: string; bloodGroup?: string; medicalNotes?: string;
  }) {
    const student = await this.prisma.student.create({ data, include: { class: true } });
    await this.redis.delPattern('stats:*');
    return student;
  }

  async update(id: string, data: Partial<{
    firstName: string; lastName: string; gender: Gender; dateOfBirth: Date;
    classId: string; status: StudentStatus; photoUrl: string; address: string;
    bloodGroup: string; medicalNotes: string;
  }>) {
    await this.findOne(id);
    const allowed = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'classId', 'status', 'photoUrl', 'address', 'bloodGroup', 'medicalNotes'] as const;
    const clean = Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
    return this.prisma.student.update({ where: { id }, data: clean, include: { class: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.student.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.redis.delPattern('stats:*');
    return { message: 'Mwanafunzi amefutwa' };
  }
}
