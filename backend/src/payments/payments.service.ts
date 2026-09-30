import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';
import { PaymentProvider } from './providers/payment.provider';
import { WebhookNotice } from './providers/payment.provider.interface';

const OPEN_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.CONTROL_NUMBER_GENERATED,
  PaymentStatus.PAYMENT_INITIATED,
];

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private paymentProvider: PaymentProvider,
    private messaging: MessagingService,
  ) {}

  gatewayStatus() {
    return this.paymentProvider.status();
  }

  async getFeeItems(classId?: string) {
    return this.prisma.feeItem.findMany({
      where: { isActive: true, ...(classId ? { OR: [{ classId }, { classId: null }] } : {}) },
      include: { class: true, academicYear: true },
      orderBy: { category: 'asc' },
    });
  }

  async getParentPayments(user: AuthUser, studentId?: string) {
    if (!user.parentId) throw new ForbiddenException();

    const where: Record<string, unknown> = { parentId: user.parentId };
    if (studentId) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { parentId: user.parentId, studentId, status: 'APPROVED' },
      });
      if (!link) throw new ForbiddenException('Mwanafunzi huyu hauhusiani na akaunti yako');
      where.studentId = studentId;
    }

    return this.prisma.payment.findMany({
      where,
      include: { feeItem: true, student: { include: { class: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * One open charge per family, pupil, and fee item. Two taps on a slow phone cannot create two
   * control numbers: the database's partial unique index rejects the second insert and we return the first.
   */
  async generateControlNumber(feeItemId: string, studentId: string, user: AuthUser) {
    if (!user.parentId) throw new ForbiddenException();
    const parentId = user.parentId;

    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId, studentId, status: 'APPROVED' },
    });
    if (!link) throw new ForbiddenException('Mwanafunzi huyu hauhusiani na akaunti yako');

    const feeItem = await this.prisma.feeItem.findUnique({ where: { id: feeItemId } });
    if (!feeItem || !feeItem.isActive) throw new NotFoundException('Kipengele cha malipo hakipatikani');

    const findOpen = () =>
      this.prisma.payment.findFirst({
        where: { parentId, studentId, feeItemId, status: { in: OPEN_STATUSES } },
        include: { feeItem: true, student: true },
      });

    const existing = await findOpen();
    if (existing) return existing;

    const controlNumber = await this.paymentProvider.generateControlNumber({
      amount: Number(feeItem.amount),
      description: feeItem.name,
      payerName: `${user.firstName} ${user.lastName}`,
    });

    let payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          parentId,
          studentId,
          feeItemId,
          controlNumber: controlNumber.number,
          amount: feeItem.amount,
          status: PaymentStatus.CONTROL_NUMBER_GENERATED,
          deadline: feeItem.dueDate || controlNumber.expiresAt,
          instructions: controlNumber.instructions,
        },
        include: { feeItem: true, student: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const winner = await findOpen();
        if (winner) return winner;
      }
      throw error;
    }

    await this.audit.log({
      userId: user.id,
      action: 'PAYMENT_GENERATED',
      module: 'payments',
      entityType: 'payment',
      entityId: payment.id,
      newValues: { controlNumber: controlNumber.number },
    });

    return payment;
  }

  async getPaymentStatus(paymentId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { feeItem: true, student: true },
    });

    if (!payment) throw new NotFoundException();
    const office = user.roles.some((role) =>
      [RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN].includes(role as RoleName),
    );
    if (!office && payment.parentId !== user.parentId) {
      throw new ForbiddenException();
    }

    if (payment.controlNumber && payment.status !== PaymentStatus.PAID && this.paymentProvider.isLive()) {
      const status = await this.paymentProvider.checkPaymentStatus(payment.controlNumber);
      if (status.paid && status.transactionRef) {
        await this.settle(payment.id, {
          transactionRef: status.transactionRef,
          paymentMethod: 'GATEWAY',
          gatewayResponse: status.raw,
          actorUserId: null,
        });
        return this.prisma.payment.findUnique({ where: { id: paymentId }, include: { feeItem: true, student: true } });
      }
    }

    return payment;
  }

  async createFeeItem(input: {
    name: string;
    category: string;
    amount: number;
    academicYearId: string;
    classId?: string;
    dueDate?: string;
    description?: string;
  }) {
    return this.prisma.feeItem.create({
      data: {
        name: input.name,
        category: input.category as never,
        amount: input.amount,
        academicYearId: input.academicYearId,
        classId: input.classId || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        description: input.description,
      },
    });
  }

  async listRecords(page = 1, limit = 50, status?: string) {
    const where = status ? { status: status as PaymentStatus } : {};
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          feeItem: true,
          student: { include: { class: true } },
          parent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 200),
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** Office records a real receipt. Safe to call twice; the second call returns the already-paid row. */
  async confirmReceipt(paymentId: string, user: AuthUser, transactionRef: string, paymentMethod?: string) {
    const reference = transactionRef.trim();
    if (reference.length < 4) throw new BadRequestException('Weka kumbukumbu halisi ya malipo kutoka benki au wakala');

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Malipo hayajapatikana');
    if (payment.status === PaymentStatus.PAID) {
      return this.prisma.payment.findUnique({ where: { id: paymentId }, include: { feeItem: true, student: true } });
    }

    await this.settle(paymentId, {
      transactionRef: reference,
      paymentMethod: paymentMethod || 'BANK_OR_MOBILE',
      actorUserId: user.id,
    });

    return this.prisma.payment.findUnique({ where: { id: paymentId }, include: { feeItem: true, student: true } });
  }

  /**
   * Gateway callback. Stored first (unique per provider+eventId), then settled once.
   * A replayed callback returns the recorded outcome without touching the payment again.
   */
  async handleWebhook(provider: string, rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    if (this.paymentProvider.providerName() === 'mock') {
      throw new NotFoundException('No payment gateway is connected. Receipts are recorded by the office.');
    }

    const notice: WebhookNotice = this.paymentProvider.parseWebhook(rawBody, headers);

    let event;
    try {
      event = await this.prisma.paymentWebhookEvent.create({
        data: {
          provider,
          eventId: notice.eventId,
          controlNumber: notice.controlNumber,
          payload: notice.raw as object,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const seen = await this.prisma.paymentWebhookEvent.findUnique({
          where: { provider_eventId: { provider, eventId: notice.eventId } },
        });
        return { received: true, duplicate: true, outcome: seen?.outcome || 'already-processed' };
      }
      throw error;
    }

    let outcome = 'ignored';
    try {
      if (!notice.paid) {
        outcome = 'not-paid';
      } else {
        const payment = await this.prisma.payment.findUnique({ where: { controlNumber: notice.controlNumber } });
        if (!payment) {
          outcome = 'unknown-control-number';
        } else if (Number(payment.amount) > notice.amount + 0.005) {
          outcome = `underpaid:${notice.amount}`;
          this.logger.warn(`webhook underpaid control=${notice.controlNumber} expected=${payment.amount} got=${notice.amount}`);
        } else {
          const settled = await this.settle(payment.id, {
            transactionRef: notice.transactionRef,
            paymentMethod: notice.paymentMethod || 'GATEWAY',
            gatewayResponse: notice.raw,
            actorUserId: null,
          });
          outcome = settled ? 'paid' : 'already-paid';
        }
      }
    } finally {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), outcome },
      });
    }

    return { received: true, duplicate: false, outcome };
  }

  /**
   * The only place a payment becomes PAID. The WHERE clause makes it idempotent under concurrency,
   * and the partial unique index on transaction_ref stops one receipt from paying two charges.
   */
  private async settle(
    paymentId: string,
    input: { transactionRef: string; paymentMethod: string; gatewayResponse?: unknown; actorUserId: string | null },
  ): Promise<boolean> {
    let result;
    try {
      result = await this.prisma.payment.updateMany({
        where: { id: paymentId, status: { not: PaymentStatus.PAID } },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionRef: input.transactionRef,
          paymentMethod: input.paymentMethod,
          gatewayResponse: (input.gatewayResponse ?? undefined) as object | undefined,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('This receipt reference is already recorded against another payment.');
      }
      throw error;
    }

    if (result.count === 0) return false;

    await this.audit.log({
      userId: input.actorUserId ?? undefined,
      action: 'UPDATE',
      module: 'payments',
      entityType: 'payment',
      entityId: paymentId,
      newValues: { status: 'PAID', transactionRef: input.transactionRef, method: input.paymentMethod },
    });

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { feeItem: true, student: true, parent: { select: { userId: true } } },
    });
    if (payment) {
      await this.messaging.notifyUser({
        userId: payment.parent.userId,
        type: 'PAYMENT_REMINDER',
        title: 'Malipo yamepokelewa / Payment received',
        message: `${payment.feeItem.name} for ${payment.student.firstName} ${payment.student.lastName} is now marked paid. Receipt: ${input.transactionRef}.`,
        data: { paymentId, controlNumber: payment.controlNumber },
      });
    }

    return true;
  }

  async getPaymentStats() {
    const [total, paid, pending, outstanding, collected] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'PAID' } }),
      this.prisma.payment.count({ where: { status: { in: OPEN_STATUSES } } }),
      this.prisma.payment.aggregate({ where: { status: { in: OPEN_STATUSES } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    ]);

    return {
      total,
      paid,
      pending,
      outstandingAmount: outstanding._sum.amount,
      collectedAmount: collected._sum.amount,
      gateway: this.paymentProvider.status(),
    };
  }
}
