import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function humanize(value?: string | null) {
  if (!value) return '';
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDate(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-GB', options ?? { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMoney(value?: number | string | null, currency = 'TZS') {
  if (value === null || value === undefined || value === '') return '—';
  const amount = typeof value === 'string' ? Number(value) : value;
  return `${currency} ${amount.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`;
}

export function initials(name?: string | null) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function daysUntil(value?: string | Date | null) {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}
