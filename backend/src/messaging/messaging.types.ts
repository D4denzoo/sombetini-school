export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendSmsInput = {
  to: string;
  message: string;
};

export type DeliveryResult = {
  channel: 'email' | 'sms';
  sent: boolean;
  provider: string;
  detail?: string;
};
