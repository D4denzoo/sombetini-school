import { Controller, Get, Post, Body, Param, Query, Req, HttpCode, HttpStatus, RawBodyRequest, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('payments')
@Controller()
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('payments/fee-items')
  @Roles(RoleName.PARENT, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Get available fee items' })
  getFeeItems(@Query('classId') classId?: string) {
    return this.paymentsService.getFeeItems(classId);
  }

  @Get('payments')
  @Roles(RoleName.PARENT)
  @ApiOperation({ summary: 'Get parent payments' })
  getParentPayments(@CurrentUser() user: AuthUser, @Query('studentId') studentId?: string) {
    return this.paymentsService.getParentPayments(user, studentId);
  }

  @Post('control-numbers')
  @Roles(RoleName.PARENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate payment control number (one open charge per pupil and fee)' })
  generateControlNumber(
    @Body() body: { feeItemId: string; studentId: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.generateControlNumber(body.feeItemId, body.studentId, user);
  }

  @Post('payments/fee-items')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a school charge' })
  createFeeItem(@Body() body: {
    name: string; category: string; amount: number; academicYearId: string;
    classId?: string; dueDate?: string; description?: string;
  }) {
    return this.paymentsService.createFeeItem(body);
  }

  @Get('payments/records')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List payment records (paged)' })
  listRecords(@Query('page') page = 1, @Query('limit') limit = 50, @Query('status') status?: string) {
    return this.paymentsService.listRecords(+page, +limit, status);
  }

  @Post('payments/:id/confirm')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a verified bank or mobile-money receipt (idempotent)' })
  confirmReceipt(
    @Param('id') id: string,
    @Body() body: { transactionRef: string; paymentMethod?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.confirmReceipt(id, user, body.transactionRef, body.paymentMethod);
  }

  @Get('payments/:id/status')
  @Roles(RoleName.PARENT, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check payment status' })
  getPaymentStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.paymentsService.getPaymentStatus(id, user);
  }

  @Get('payments/stats')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Payment statistics and gateway status' })
  getStats() {
    return this.paymentsService.getPaymentStats();
  }

  /**
   * Gateway callback. Public by necessity; trust comes from the HMAC signature, not from a login.
   * Refused entirely while PAYMENT_PROVIDER=mock.
   */
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Post('payments/webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signed payment gateway callback' })
  webhook(@Param('provider') provider: string, @Req() req: RawBodyRequest<Request>) {
    if (!req.rawBody) throw new BadRequestException('Raw body unavailable');
    return this.paymentsService.handleWebhook(provider.toLowerCase(), req.rawBody, req.headers);
  }
}
