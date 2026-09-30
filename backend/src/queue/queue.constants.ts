export const MESSAGING_QUEUE = 'messaging';
export const MAINTENANCE_QUEUE = 'maintenance';
export const DOCUMENTS_QUEUE = 'documents';

export const MessagingJob = {
  EMAIL: 'email',
  SMS: 'sms',
  NOTIFY_USER: 'notify-user',
} as const;

export const MaintenanceJob = {
  RETENTION: 'retention',
  EXPIRE_PAYMENTS: 'expire-payments',
} as const;

export const DocumentsJob = {
  REPORT_CARD_PDF: 'report-card-pdf',
} as const;

export type EmailJobData = { to: string; subject: string; text: string; html?: string };
export type SmsJobData = { to: string; message: string };
export type NotifyUserJobData = {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};
export type ReportCardPdfJobData = { reportCardId: string };
