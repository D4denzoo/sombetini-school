import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, ParentLinkStatus, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';
import { UpdateParentDto } from './dto/update-parent.dto';

const MAX_ACTIVE_CLAIMS = 10;

@Injectable()
export class ParentsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.parent.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, emailVerified: true } },
          children: { include: { student: { select: { id: true, firstName: true, lastName: true, registrationNo: true, class: true, status: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.parent.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user?: AuthUser) {
    this.assertOwnParent(id, user);
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, emailVerified: true } },
        children: { include: { student: { include: { class: true } } } },
      },
    });
    if (!parent) throw new NotFoundException('Mzazi hajapatikana');
    return parent;
  }

  async create(data: { userId: string; occupation?: string; address?: string; emergencyContact?: string; emergencyPhone?: string }) {
    const existing = await this.prisma.parent.findUnique({ where: { userId: data.userId } });
    if (existing) throw new ConflictException('Mtumiaji huyu tayari ni mzazi');

    return this.prisma.parent.create({
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, data: UpdateParentDto, user?: AuthUser) {
    this.assertOwnParent(id, user);
    await this.findOne(id);
    return this.prisma.parent.update({
      where: { id },
      data: {
        ...(data.occupation !== undefined ? { occupation: data.occupation } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact } : {}),
        ...(data.emergencyPhone !== undefined ? { emergencyPhone: data.emergencyPhone } : {}),
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, emailVerified: true } } },
    });
  }

  private assertOwnParent(id: string, user?: AuthUser) {
    if (!user) return;
    const staff = user.roles.some((role) =>
      [RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.ACADEMIC_ADMIN].includes(role as RoleName),
    );
    if (staff) return;
    if (user.roles.includes(RoleName.PARENT) && user.parentId !== id) {
      throw new ForbiddenException('Huna ruhusa ya kuona wasifu wa mzazi mwingine');
    }
  }

  async linkChild(parentId: string, studentId: string, relationship = 'parent', isPrimary = false) {
    await this.findOne(parentId);
    const student = await this.prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
    if (!student) throw new NotFoundException('Mwanafunzi hajapatikana');

    return this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId, relationship, isPrimary, status: ParentLinkStatus.APPROVED },
      update: { relationship, isPrimary, status: ParentLinkStatus.APPROVED },
    });
  }

  async unlinkChild(parentId: string, studentId: string) {
    await this.prisma.parentStudent.delete({
      where: { parentId_studentId: { parentId, studentId } },
    });
    return { message: 'Uhusiano umefutwa' };
  }

  async getChildren(parentId: string, user?: AuthUser) {
    this.assertOwnParent(parentId, user);
    const parent = await this.findOne(parentId);
    return parent.children;
  }

  async claimChild(
    user: AuthUser,
    input: {
      registrationNo: string;
      firstName: string;
      lastName: string;
      gender: Gender;
      dateOfBirth: string;
      classId: string;
      relationship?: string;
    },
  ) {
    if (!user.parentId) throw new ForbiddenException('Parent profile required');

    const registrationNo = input.registrationNo.trim().toUpperCase();
    if (!registrationNo) throw new BadRequestException('Registration number is required');

    const classRow = await this.prisma.class.findFirst({ where: { id: input.classId, isActive: true } });
    if (!classRow) throw new BadRequestException('Choose a valid class');

    const activeCount = await this.prisma.parentStudent.count({
      where: {
        parentId: user.parentId,
        status: { in: [ParentLinkStatus.PENDING, ParentLinkStatus.APPROVED] },
      },
    });
    if (activeCount >= MAX_ACTIVE_CLAIMS) {
      throw new BadRequestException(`You can have at most ${MAX_ACTIVE_CLAIMS} children on this account (pending or approved).`);
    }

    const dob = new Date(input.dateOfBirth);
    if (Number.isNaN(dob.getTime())) throw new BadRequestException('Invalid date of birth');

    const existing = await this.prisma.student.findFirst({
      where: { registrationNo, deletedAt: null },
    });

    if (existing) {
      const prior = await this.prisma.parentStudent.findUnique({
        where: { parentId_studentId: { parentId: user.parentId, studentId: existing.id } },
      });
      if (prior) {
        if (prior.status === ParentLinkStatus.REJECTED) {
          return this.prisma.parentStudent.update({
            where: { parentId_studentId: { parentId: user.parentId, studentId: existing.id } },
            data: {
              status: ParentLinkStatus.PENDING,
              relationship: input.relationship?.trim() || prior.relationship || 'parent',
              reviewedAt: null,
              reviewedById: null,
              rejectionReason: null,
            },
            include: { student: { include: { class: true } } },
          });
        }
        throw new ConflictException(
          prior.status === ParentLinkStatus.APPROVED
            ? 'This child is already linked to your account.'
            : 'You already have a pending claim for this child.',
        );
      }

      return this.prisma.parentStudent.create({
        data: {
          parentId: user.parentId,
          studentId: existing.id,
          relationship: input.relationship?.trim() || 'parent',
          isPrimary: activeCount === 0,
          status: ParentLinkStatus.PENDING,
        },
        include: { student: { include: { class: true } } },
      });
    }

    const student = await this.prisma.student.create({
      data: {
        registrationNo,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        gender: input.gender,
        dateOfBirth: dob,
        classId: input.classId,
        admissionDate: new Date(),
        status: StudentStatus.PENDING,
        parents: {
          create: {
            parentId: user.parentId,
            relationship: input.relationship?.trim() || 'parent',
            isPrimary: activeCount === 0,
            status: ParentLinkStatus.PENDING,
          },
        },
      },
      include: { class: true, parents: true },
    });

    await this.redis.delPattern('stats:*');

    const link = student.parents[0];
    return {
      ...link,
      student: {
        id: student.id,
        registrationNo: student.registrationNo,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        status: student.status,
        classId: student.classId,
        class: student.class,
        dateOfBirth: student.dateOfBirth,
      },
    };
  }

  async listPendingClaims() {
    return this.prisma.parentStudent.findMany({
      where: { status: ParentLinkStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: {
        parent: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          },
        },
        student: {
          include: { class: { select: { id: true, name: true, level: true } } },
        },
      },
    });
  }

  async approveClaim(parentId: string, studentId: string, reviewer: AuthUser) {
    const link = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
      include: { student: true },
    });
    if (!link) throw new NotFoundException('Claim not found');
    if (link.status !== ParentLinkStatus.PENDING) {
      throw new BadRequestException('This claim is not pending');
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.student.updateMany({
        where: { id: studentId, status: StudentStatus.PENDING },
        data: { status: StudentStatus.ACTIVE },
      }),
      this.prisma.parentStudent.update({
        where: { parentId_studentId: { parentId, studentId } },
        data: {
          status: ParentLinkStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: reviewer.id,
          rejectionReason: null,
        },
        include: {
          parent: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
          student: { include: { class: true } },
        },
      }),
    ]);

    await this.redis.delPattern('stats:*');
    return updated;
  }

  async rejectClaim(parentId: string, studentId: string, reviewer: AuthUser, reason?: string) {
    const link = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
    if (!link) throw new NotFoundException('Claim not found');
    if (link.status !== ParentLinkStatus.PENDING) {
      throw new BadRequestException('This claim is not pending');
    }

    return this.prisma.parentStudent.update({
      where: { parentId_studentId: { parentId, studentId } },
      data: {
        status: ParentLinkStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: reviewer.id,
        rejectionReason: reason?.trim() || null,
      },
      include: {
        parent: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
        student: { include: { class: true } },
      },
    });
  }
}
