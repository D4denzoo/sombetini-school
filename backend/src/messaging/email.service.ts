import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { DeliveryResult, SendEmailInput } from './messaging.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('SMTP_HOST')?.trim() && this.config.get<string>('SMTP_FROM')?.trim());
  }

  status() {
    return {
      configured: this.isConfigured(),
      host: this.config.get<string>('SMTP_HOST') || null,
      from: this.config.get<string>('SMTP_FROM') || null,
    };
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host || !from) {
      throw new ServiceUnavailableException(
        'Email is not connected. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in the environment file.',
      );
    }

    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: pass || '' } : undefined,
    });

    return this.transporter;
  }

  async send(input: SendEmailInput): Promise<DeliveryResult> {
    const from = this.config.get<string>('SMTP_FROM')?.trim() || 'noreply@sombetini.ac.tz';
    const transporter = this.getTransporter();

    try {
      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html || `<p>${input.text.replace(/\n/g, '<br/>')}</p>`,
      });

      return {
        channel: 'email',
        sent: true,
        provider: 'smtp',
        detail: info.messageId,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'SMTP send failed';
      this.logger.error(`Email to ${input.to} failed: ${detail}`);
      throw new ServiceUnavailableException(`Email could not be sent: ${detail}`);
    }
  }
}
