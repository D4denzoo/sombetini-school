import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RegisterDto, ChangePasswordDto, InitialSetupDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { RoleName } from '../common/constants/roles';
import { MessagingService } from '../messaging/messaging.service';
import { SessionService } from './session.service';
import { assertStrongPassword } from './password-policy';

const EMAIL_VERIFY = 'EMAIL_VERIFY';
const PASSWORD_RESET = 'PASSWORD_RESET';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private audit: AuditService,
    private messaging: MessagingService,
    private sessions: SessionService,
  ) {}

  private frontendUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { roles: { include: { role: true } } },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Barua pepe au nenosiri si sahihi');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Akaunti imefungwa. Jaribu tena baada ya dakika ${minutes}`);
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const maxAttempts = this.config.get<number>('LOGIN_MAX_ATTEMPTS', 5);
      const lockoutMinutes = this.config.get<number>('LOGIN_LOCKOUT_MINUTES', 15);

      const updateData: { loginAttempts: number; lockedUntil?: Date } = { loginAttempts: attempts };
      if (attempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      }

      await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      await this.audit.log({ userId: user.id, action: 'LOGIN_FAILED', module: 'auth', ipAddress: ip, userAgent });
      throw new UnauthorizedException('Barua pepe au nenosiri si sahihi');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Akaunti haijaidhinishwa bado');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Please confirm your email first. Open the link we sent you, or request a new one.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (user.twoFactorEnabled) {
      const tempToken = uuidv4();
      await this.redis.set(`2fa:${tempToken}`, user.id, 300);
      return {
        requires2FA: true,
        tempToken,
        method: user.twoFactorMethod,
      };
    }

    return this.generateTokens(user.id, user.email, ip, userAgent);
  }

  async verify2FA(code: string, tempToken: string, ip?: string, userAgent?: string) {
    const userId = await this.redis.get<string>(`2fa:${tempToken}`);
    if (!userId) {
      throw new UnauthorizedException('Msimbo wa uthibitishaji umekwisha muda');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Uthibitishaji umeshindwa');
    }

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
      throw new UnauthorizedException('Msimbo wa uthibitishaji si sahihi');
    }

    await this.redis.del(`2fa:${tempToken}`);
    return this.generateTokens(user.id, user.email, ip, userAgent);
  }

  /** Rotates the refresh token: the old one is closed, a new pair is issued for the same device. */
  async refreshToken(refreshToken: string, ip?: string, userAgent?: string) {
    return this.sessions.rotate(refreshToken, ip, userAgent);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('This email already has an account. Sign in instead.');
    }

    assertStrongPassword(dto.password);

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const parentRole = await this.prisma.role.findUnique({ where: { name: RoleName.PARENT } });
    if (!parentRole) {
      throw new BadRequestException('Parent sign-up is not ready yet. Ask the school office.');
    }

    // Never auto-verify self-registered parents — even without SMTP. The office confirms the email.
    const requireVerification = this.messaging.status().email.configured;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        status: 'ACTIVE',
        emailVerified: false,
        roles: { create: [{ roleId: parentRole.id }] },
        parent: { create: {} },
      },
    });

    await this.audit.log({ userId: user.id, action: 'CREATE', module: 'auth', entityType: 'user', entityId: user.id });

    if (requireVerification) {
      try {
        await this.sendVerificationEmail(user.id, user.email, user.firstName);
      } catch (error) {
        // Do not leave an unverified account that conflict-locks the email on retry.
        await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
        throw error;
      }
      return {
        message: 'Almost done. We emailed you a confirmation link — open it, then sign in.',
        userId: user.id,
        verificationRequired: true,
      };
    }

    return {
      message: 'Your parent account was created. Ask the school office to confirm your email before you can sign in.',
      userId: user.id,
      verificationRequired: true,
    };
  }

  private async sendVerificationEmail(userId: string, email: string, firstName: string) {
    await this.prisma.otpToken.updateMany({
      where: { userId, type: EMAIL_VERIFY, used: false },
      data: { used: true },
    });
    const token = uuidv4();
    await this.prisma.otpToken.create({
      data: { userId, token, type: EMAIL_VERIFY, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    const link = `${this.frontendUrl()}/login?portal=parent&verify=${token}`;
    await this.messaging.sendEmail(
      email,
      'Confirm your Sombetini Parent Portal email',
      `Habari ${firstName},\n\nTap this link within 24 hours to confirm your email and open the Parent Portal:\n${link}\n\nIf you did not create this account, ignore this message.\n\nSombetini Primary School`,
      `<p>Habari ${firstName},</p><p>Tap this link within 24 hours to confirm your email and open the Parent Portal:</p><p><a href="${link}">${link}</a></p><p>If you did not create this account, ignore this message.</p><p>Sombetini Primary School</p>`,
    );
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.otpToken.findFirst({
      where: { token, type: EMAIL_VERIFY, used: false, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new BadRequestException('This confirmation link is invalid or has expired. Request a new one.');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      this.prisma.otpToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);
    await this.sessions.invalidate(record.userId);

    return { message: 'Email confirmed. You can sign in now.' };
  }

  async resendVerification(email: string) {
    const generic = { message: 'If that email has an unconfirmed account, a new confirmation link has been sent.' };
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.deletedAt || user.emailVerified) return generic;
    if (!this.messaging.status().email.configured) {
      throw new BadRequestException('Email is not connected on this server yet. Ask the school office to confirm your account.');
    }
    await this.sendVerificationEmail(user.id, user.email, user.firstName);
    return generic;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return the same message so callers cannot probe which emails exist.
    const generic = {
      message: 'If that email has an account, a password reset link has been sent.',
    };

    if (!user || user.deletedAt) return generic;
    if (!this.messaging.status().email.configured) {
      throw new BadRequestException(
        'Email is not connected on this server yet. Ask the school office to set SMTP settings, or change the password from the office.',
      );
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        token,
        type: PASSWORD_RESET,
        expiresAt,
      },
    });

    const link = `${this.frontendUrl()}/login?portal=parent&reset=${token}`;

    await this.messaging.sendEmail(
      user.email,
      'Reset your Sombetini password',
      `Habari ${user.firstName},\n\nUse this link within one hour to choose a new password:\n${link}\n\nIf you did not ask for this, ignore the message.\n\nSombetini Primary School`,
      `<p>Habari ${user.firstName},</p><p>Use this link within one hour to choose a new password:</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore the message.</p><p>Sombetini Primary School</p>`,
    );

    if (user.phone && this.messaging.status().sms.configured) {
      try {
        await this.messaging.sendSms(user.phone, `Sombetini: password reset link sent to your email. Valid for 1 hour.`);
      } catch {
        // Email already left; SMS is optional.
      }
    }

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.otpToken.findFirst({
      where: {
        token: dto.token,
        type: PASSWORD_RESET,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new BadRequestException('This reset link is invalid or has expired.');

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        // A reset proves control of the mailbox, so the address counts as confirmed too.
        data: { passwordHash, passwordChangedAt: new Date(), loginAttempts: 0, lockedUntil: null, emailVerified: true },
      }),
      this.prisma.otpToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);
    await this.sessions.revokeAll(record.userId);

    await this.audit.log({ userId: record.userId, action: 'PASSWORD_CHANGE', module: 'auth' });
    return { message: 'Password updated. You can sign in with the new password.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new BadRequestException('Nenosiri la sasa si sahihi');

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    // Other devices must sign in again with the new password.
    await this.sessions.revokeAll(userId);

    await this.audit.log({ userId, action: 'PASSWORD_CHANGE', module: 'auth' });
    return { message: 'Nenosiri limebadilishwa kwa mafanikio' };
  }

  async setup2FA(userId: string, method: 'TOTP') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const secret = authenticator.generateSecret();
    const issuer = this.config.get<string>('TOTP_ISSUER', 'Sombetini Primary School');
    const otpauth = authenticator.keyuri(user.email, issuer, secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    await this.redis.set(`2fa-setup:${userId}`, secret, 600);

    return { secret, qrCode, method };
  }

  async enable2FA(userId: string, code: string, method: 'TOTP') {
    const secret = await this.redis.get<string>(`2fa-setup:${userId}`);
    if (!secret) throw new BadRequestException('Muda wa usanidi umekwisha');

    const valid = authenticator.verify({ token: code, secret });
    if (!valid) throw new BadRequestException('Msimbo si sahihi');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorMethod: method, twoFactorSecret: secret },
    });

    await this.redis.del(`2fa-setup:${userId}`);
    return { message: 'Uthibitishaji wa hatua mbili umewashwa' };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('2FA haijawashwa');

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new BadRequestException('Msimbo si sahihi');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorMethod: null },
    });

    return { message: 'Uthibitishaji wa hatua mbili umezimwa' };
  }

  /** True only before the first administrator account exists. */
  async setupStatus() {
    const settings = await this.prisma.schoolSettings.findFirst({ select: { isSetupComplete: true } });
    const existingAdmin = await this.prisma.user.count({
      where: { deletedAt: null, roles: { some: { role: { name: RoleName.SUPER_ADMIN } } } },
    });
    return { open: !settings?.isSetupComplete && existingAdmin === 0 };
  }

  async initialSetup(dto: InitialSetupDto) {
    const settings = await this.prisma.schoolSettings.findFirst();
    const existingAdmin = await this.prisma.user.count({
      where: { deletedAt: null, roles: { some: { role: { name: RoleName.SUPER_ADMIN } } } },
    });
    if (settings?.isSetupComplete || existingAdmin > 0) {
      throw new ForbiddenException('Usanidi wa awali umekamilika tayari');
    }

    const passwordHash = await argon2.hash(dto.adminPassword, { type: argon2.argon2id });
    const superAdminRole = await this.prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } });

    const result = await this.prisma.$transaction(async (tx) => {
      if (settings) {
        await tx.schoolSettings.update({
          where: { id: settings.id },
          data: {
            schoolName: dto.schoolName,
            ...(dto.motto ? { motto: dto.motto } : {}),
            ...(dto.vision ? { vision: dto.vision } : {}),
            ...(dto.mission ? { mission: dto.mission } : {}),
            isSetupComplete: true,
          },
        });
      } else {
        await tx.schoolSettings.create({
          data: {
            schoolName: dto.schoolName,
            motto: dto.motto,
            vision: dto.vision,
            mission: dto.mission,
            isSetupComplete: true,
          },
        });
      }

      const user = await tx.user.create({
        data: {
          email: dto.adminEmail.toLowerCase().trim(),
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          status: 'ACTIVE',
          emailVerified: true,
          roles: superAdminRole ? { create: [{ roleId: superAdminRole.id }] } : undefined,
        },
      });

      return user;
    });

    return { message: 'Usanidi wa awali umekamilika', adminId: result.id };
  }

  /** Closes this device's session only; other phones or laptops stay signed in. */
  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.sessions.revoke(sessionId);
      await this.sessions.markSessionClosed(sessionId);
    } else {
      await this.sessions.revokeAll(userId);
    }
    await this.audit.log({ userId, action: 'LOGOUT', module: 'auth' });
    return { message: 'Umetoka kwa mafanikio' };
  }

  /** Signs the account out everywhere. */
  async logoutAll(userId: string) {
    await this.sessions.revokeAll(userId);
    await this.audit.log({ userId, action: 'LOGOUT', module: 'auth', newValues: { scope: 'all-devices' } });
    return { message: 'Signed out on every device.' };
  }

  async listSessions(userId: string) {
    return this.sessions.listSessions(userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        parent: { include: { children: { include: { student: { include: { class: true } } } } } },
        teacher: { include: { assignments: { include: { class: true, subject: true } } } },
      },
    });

    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: user.twoFactorEnabled,
      roles: user.roles.map(r => ({ name: r.role.name, displayName: r.role.displayName })),
      parent: user.parent ? {
        id: user.parent.id,
        children: user.parent.children
          .filter((c) => c.status === 'APPROVED')
          .map((c) => ({
            id: c.student.id,
            name: `${c.student.firstName} ${c.student.lastName}`,
            registrationNo: c.student.registrationNo,
            classId: c.student.classId,
            class: c.student.class.name,
            relationship: c.relationship,
            linkStatus: c.status,
          })),
        pendingChildren: user.parent.children
          .filter((c) => c.status === 'PENDING')
          .map((c) => ({
            id: c.student.id,
            name: `${c.student.firstName} ${c.student.lastName}`,
            registrationNo: c.student.registrationNo,
            classId: c.student.classId,
            class: c.student.class.name,
            relationship: c.relationship,
            linkStatus: c.status,
          })),
      } : null,
      teacher: user.teacher ? {
        id: user.teacher.id,
        staffNo: user.teacher.staffNo,
        assignments: user.teacher.assignments.map(a => ({
          class: a.class.name,
          subject: a.subject.name,
        })),
      } : null,
    };
  }

  private async generateTokens(userId: string, email: string, ip?: string, userAgent?: string) {
    const pair = await this.sessions.issue(userId, email, ip, userAgent);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    await this.audit.log({ userId, action: 'LOGIN', module: 'auth', ipAddress: ip, userAgent });

    return pair;
  }
}
