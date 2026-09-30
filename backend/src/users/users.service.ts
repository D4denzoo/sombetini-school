import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../common/constants/roles';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { SessionService } from '../auth/session.service';
import { assertStrongPassword } from '../auth/password-policy';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private sessions: SessionService) {}

  async findAll(page = 1, limit = 20, status?: string, search?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status as UserStatus;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          status: true, avatarUrl: true, lastLoginAt: true, createdAt: true,
          roles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, status: true, emailVerified: true, twoFactorEnabled: true,
        lastLoginAt: true, lastLoginIp: true, createdAt: true, updatedAt: true,
        roles: { include: { role: true } },
        parent: { select: { id: true } },
        teacher: { select: { id: true, staffNo: true } },
      },
    });
    if (!user) throw new NotFoundException('Mtumiaji hajapatikana');
    return user;
  }

  async updateStatus(id: string, status: UserStatus) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    });
    if (status !== 'ACTIVE') {
      // Close every device session and drop the Redis identity + open flags immediately.
      await this.sessions.revokeAll(id);
    } else {
      await this.sessions.invalidate(id);
    }
    return updated;
  }

  async verifyEmail(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
      select: { id: true, email: true, emailVerified: true },
    });
    await this.sessions.invalidate(id);
    return updated;
  }

  async assignRoles(id: string, roleIds: string[], actor: AuthUser) {
    const target = await this.findOne(id);
    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds } } });
    const grantsSuper = roles.some((role) => role.name === RoleName.SUPER_ADMIN);
    const targetIsSuper = target.roles.some((entry) => entry.role.name === RoleName.SUPER_ADMIN);
    if ((grantsSuper || targetIsSuper) && !actor.roles.includes(RoleName.SUPER_ADMIN)) {
      throw new ForbiddenException('Ni msimamizi mkuu pekee anayeweza kubadilisha jukumu hilo');
    }
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: roleIds.map(roleId => ({ userId: id, roleId })),
      });
    }
    await this.sessions.invalidate(id);
    return this.findOne(id);
  }

  async getRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async removeParentAccount(id: string, actor: AuthUser) {
    if (actor.id === id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        parent: { select: { id: true, _count: { select: { payments: true } } } },
      },
    });
    if (!user?.parent) throw new NotFoundException('That parent account was not found.');

    const roleNames = user.roles.map((entry) => entry.role.name);
    if (!roleNames.includes(RoleName.PARENT) || roleNames.some((name) => name !== RoleName.PARENT)) {
      throw new ForbiddenException('Only a parent account can be deleted here.');
    }
    if (user.parent._count.payments > 0) {
      throw new ConflictException('This parent has fee records, so the account cannot be deleted.');
    }

    const [notices, approvals, markHistory] = await Promise.all([
      this.prisma.announcement.count({ where: { authorId: id } }),
      this.prisma.resultApproval.count({ where: { reviewedById: id } }),
      this.prisma.markAuditLog.count({ where: { userId: id } }),
    ]);
    if (notices || approvals || markHistory) {
      throw new ConflictException('This account is tied to school records, so it cannot be deleted.');
    }

    await this.sessions.revokeAll(id);
    await this.prisma.$transaction([
      this.prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      this.prisma.aiConversation.updateMany({ where: { userId: id }, data: { userId: null } }),
      this.prisma.studentMark.updateMany({ where: { submittedById: id }, data: { submittedById: null } }),
      this.prisma.studentMark.updateMany({ where: { approvedById: id }, data: { approvedById: null } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
    return { deleted: true, email: user.email };
  }

  async provision(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    kind: 'PARENT' | 'TEACHER';
    staffNo?: string;
  }) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Barua pepe tayari imesajiliwa');

    if (input.kind === 'PARENT') {
      throw new ConflictException('Parents create their own accounts from the Parent Portal. The office only confirms emails and child claims.');
    }

    const roleName = RoleName.TEACHER;
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Jukumu halijapatikana. Endesha usanidi wa majukumu kwanza.');

    assertStrongPassword(input.password);

    if (!input.staffNo?.trim()) {
      throw new ConflictException('Nambari ya mfanyakazi inahitajika');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        status: 'ACTIVE',
        emailVerified: true,
        roles: { create: [{ roleId: role.id }] },
        teacher: { create: { staffNo: input.staffNo!.trim(), joinDate: new Date() } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        parent: { select: { id: true } },
        teacher: { select: { id: true, staffNo: true } },
      },
    });
  }
}
