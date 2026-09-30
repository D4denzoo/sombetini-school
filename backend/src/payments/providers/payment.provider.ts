import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  PaymentProviderInterface,
  ControlNumberRequest,
  ControlNumberResponse,
  PaymentStatusResponse,
  WebhookNotice,
} from './payment.provider.interface';

/**
 * Payment gateway adapter.
 *
 * `mock` issues control numbers the office reconciles by hand and never reports a payment as made.
 * `gepg` (or any bank gateway) is wired the same way: the school supplies credentials, the gateway
 * calls POST /api/v1/payments/webhook/<provider> with a signed body, and settlement happens here.
 */
@Injectable()
export class PaymentProvider implements PaymentProviderInterface {
  constructor(private config: ConfigService) {}

  providerName(): string {
    return (this.config.get<string>('PAYMENT_PROVIDER') || 'mock').trim().toLowerCase();
  }

  isLive(): boolean {
    return this.providerName() !== 'mock' && Boolean(this.config.get<string>('PAYMENT_API_KEY')?.trim());
  }

  status() {
    return {
      provider: this.providerName(),
      live: this.isLive(),
      webhookConfigured: Boolean(this.config.get<string>('PAYMENT_WEBHOOK_SECRET')?.trim()),
    };
  }

  async generateControlNumber(request: ControlNumberRequest): Promise<ControlNumberResponse> {
    const provider = this.providerName();

    if (provider === 'mock') {
      return this.mockGenerateControlNumber(request);
    }

    // Integration point for GePG or a bank gateway once the school's merchant account exists.
    throw new ServiceUnavailableException(
      `Payment provider '${provider}' has no connector yet. Keep PAYMENT_PROVIDER=mock until the gateway adapter is added.`,
    );
  }

  async checkPaymentStatus(controlNumber: string): Promise<PaymentStatusResponse> {
    const provider = this.providerName();

    if (provider === 'mock') {
      return { paid: false, raw: { controlNumber, checkedAt: new Date() } };
    }

    throw new ServiceUnavailableException(`Payment provider '${provider}' has no connector yet.`);
  }

  /**
   * Generic signed-JSON webhook. The gateway (or a small adapter in front of it) posts:
   *   { "eventId": "...", "controlNumber": "...", "transactionRef": "...", "amount": 50000, "status": "PAID", "paymentMethod": "MPESA" }
   * with headers:
   *   x-payment-signature: <hex HMAC-SHA256 of the raw body using PAYMENT_WEBHOOK_SECRET>
   *   x-payment-timestamp: <unix seconds, must be within 5 minutes>
   * Replays are harmless: eventId is unique in payment_webhook_events.
   */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookNotice {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('PAYMENT_WEBHOOK_SECRET is not set, so gateway callbacks are refused.');
    }

    const header = headers['x-payment-signature'];
    const provided = (Array.isArray(header) ? header[0] : header || '').trim().toLowerCase();
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'))
    ) {
      throw new UnauthorizedException('Webhook signature does not match');
    }

    const stamped = headers['x-payment-timestamp'];
    const stamp = Number(Array.isArray(stamped) ? stamped[0] : stamped);
    if (!Number.isFinite(stamp) || Math.abs(Date.now() / 1000 - stamp) > 300) {
      throw new UnauthorizedException('Webhook timestamp is missing or too old');
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Webhook body is not JSON');
    }

    const eventId = String(body.eventId || body.event_id || '').trim();
    const controlNumber = String(body.controlNumber || body.control_number || '').trim();
    const transactionRef = String(body.transactionRef || body.transaction_ref || body.receipt || '').trim();
    const amount = Number(body.amount);
    const status = String(body.status || '').toUpperCase();

    if (!eventId || !controlNumber || !transactionRef || !Number.isFinite(amount)) {
      throw new BadRequestException('Webhook is missing eventId, controlNumber, transactionRef, or amount');
    }

    return {
      eventId,
      controlNumber,
      transactionRef,
      amount,
      paid: status === 'PAID' || status === 'SUCCESS' || status === 'COMPLETED',
      paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
      raw: body,
    };
  }

  private mockGenerateControlNumber(request: ControlNumberRequest): ControlNumberResponse {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const number = `99${timestamp}${random}`;

    const instructions = [
      `NAMBARI YA KUDHIBITI: ${number}`,
      `KIASI: TZS ${request.amount.toLocaleString()}`,
      `LIPIA KUPITIA:`,
      `1. Benki yoyote au wakala wa M-Pesa/Tigo Pesa/Airtel Money`,
      `2. Chagua "Malipo ya Serikali" au "Government Payments"`,
      `3. Weka nambari ya kudhibiti: ${number}`,
      `4. Thibitisha kiasi: TZS ${request.amount.toLocaleString()}`,
      ``,
      `MUHIMU: Malipo yanapaswa kukamilika ndani ya siku 30.`,
      `Ofisi inathibitisha risiti kabla ya hali kubadilika kuwa imelipwa.`,
    ].join('\n');

    return {
      number,
      instructions,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}
