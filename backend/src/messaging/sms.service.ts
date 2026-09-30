import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryResult, SendSmsInput } from './messaging.types';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  providerName(): string {
    return (this.config.get<string>('SMS_PROVIDER') || '').trim().toLowerCase() || 'none';
  }

  isConfigured(): boolean {
    const provider = this.providerName();
    if (!provider || provider === 'none' || provider === 'mock') return false;
    return Boolean(this.config.get<string>('SMS_API_KEY')?.trim());
  }

  status() {
    return {
      configured: this.isConfigured(),
      provider: this.providerName(),
      senderId: this.config.get<string>('SMS_SENDER_ID') || null,
    };
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits.slice(1);
    if (digits.startsWith('0') && digits.length === 10) return `255${digits.slice(1)}`;
    return digits;
  }

  async send(input: SendSmsInput): Promise<DeliveryResult> {
    const provider = this.providerName();
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS is not connected. Set SMS_PROVIDER to beem, africastalking, or twilio, plus SMS_API_KEY (and SMS_API_SECRET where required).',
      );
    }

    const to = this.normalizePhone(input.to);
    const sender = this.config.get<string>('SMS_SENDER_ID')?.trim() || 'SOMBETINI';

    try {
      if (provider === 'beem') {
        return await this.sendBeem(to, input.message, sender);
      }
      if (provider === 'africastalking') {
        return await this.sendAfricasTalking(to, input.message, sender);
      }
      if (provider === 'twilio') {
        return await this.sendTwilio(to, input.message);
      }
      throw new ServiceUnavailableException(`Unsupported SMS provider '${provider}'. Use beem, africastalking, or twilio.`);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const detail = error instanceof Error ? error.message : 'SMS send failed';
      this.logger.error(`SMS to ${to} failed: ${detail}`);
      throw new ServiceUnavailableException(`SMS could not be sent: ${detail}`);
    }
  }

  private async sendBeem(to: string, message: string, sender: string): Promise<DeliveryResult> {
    const apiKey = this.config.get<string>('SMS_API_KEY')!.trim();
    const secret = this.config.get<string>('SMS_API_SECRET')?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('Beem SMS needs SMS_API_SECRET as well as SMS_API_KEY.');
    }

    const auth = Buffer.from(`${apiKey}:${secret}`).toString('base64');
    const response = await fetch('https://apisms.beem.africa/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        source_addr: sender.slice(0, 11),
        schedule_time: '',
        encoding: 0,
        message,
        recipients: [{ recipient_id: '1', dest_addr: to }],
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(body || `Beem HTTP ${response.status}`);
    }

    return { channel: 'sms', sent: true, provider: 'beem', detail: body.slice(0, 200) };
  }

  private async sendAfricasTalking(to: string, message: string, sender: string): Promise<DeliveryResult> {
    const apiKey = this.config.get<string>('SMS_API_KEY')!.trim();
    const username = this.config.get<string>('SMS_USERNAME')?.trim() || 'sandbox';
    const params = new URLSearchParams({
      username,
      to: `+${to}`,
      message,
      from: sender,
    });

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey,
      },
      body: params.toString(),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(body || `Africa's Talking HTTP ${response.status}`);
    }

    return { channel: 'sms', sent: true, provider: 'africastalking', detail: body.slice(0, 200) };
  }

  private async sendTwilio(to: string, message: string): Promise<DeliveryResult> {
    const accountSid = this.config.get<string>('SMS_API_KEY')!.trim();
    const authToken = this.config.get<string>('SMS_API_SECRET')?.trim();
    const from = this.config.get<string>('SMS_SENDER_ID')?.trim();
    if (!authToken || !from) {
      throw new ServiceUnavailableException('Twilio needs SMS_API_SECRET (auth token) and SMS_SENDER_ID (from number).');
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams({
      To: `+${to}`,
      From: from,
      Body: message,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(body || `Twilio HTTP ${response.status}`);
    }

    return { channel: 'sms', sent: true, provider: 'twilio', detail: body.slice(0, 200) };
  }
}
