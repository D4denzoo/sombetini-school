export interface ControlNumberRequest {
  amount: number;
  description: string;
  payerName: string;
}

export interface ControlNumberResponse {
  number: string;
  instructions: string;
  expiresAt: Date;
}

export interface PaymentStatusResponse {
  paid: boolean;
  transactionRef?: string;
  raw?: unknown;
}

/** Normalised shape every gateway callback is mapped to before settlement. */
export interface WebhookNotice {
  /** Provider's own unique id for this callback; used to ignore replays. */
  eventId: string;
  controlNumber: string;
  transactionRef: string;
  amount: number;
  paid: boolean;
  paymentMethod?: string;
  raw: unknown;
}

export abstract class PaymentProviderInterface {
  abstract generateControlNumber(request: ControlNumberRequest): Promise<ControlNumberResponse>;
  abstract checkPaymentStatus(controlNumber: string): Promise<PaymentStatusResponse>;
  /** Verifies the signature and maps the raw callback. Throws when the payload is not trusted. */
  abstract parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookNotice;
}
