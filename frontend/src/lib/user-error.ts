const TECHNICAL =
  /prisma|p20\d\d|stack|node_modules|econn|enotfound|sql|postgres|syntax error|typeerror|referenceerror|cannot read|undefined|jwt|secret|exception|internal server|at \w+\s*\(|\/src\/|\\src\\|trigger|violates|constraint/i;

export function looksTechnical(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 280) return true;
  return TECHNICAL.test(value);
}

/** Message shown to families and staff. Technical detail stays in logs. */
export function userFacingMessage(status: number, raw?: string | null, code?: string | null): string {
  if (code === 'EMAIL_NOT_VERIFIED') {
    return 'Confirm your email before signing in. Open the link we sent, or ask the school office to confirm it.';
  }
  if (code === 'DUPLICATE') {
    return 'This is already on the system. Sign in if you already have an account, or use different details.';
  }

  const safe = raw && !looksTechnical(raw) ? raw.trim() : '';

  if (status === 400 || status === 422) {
    return safe || 'Check the details you entered and try again.';
  }
  if (status === 401) {
    return safe || 'Your session ended. Sign in again to continue.';
  }
  if (status === 403) {
    return safe || 'You do not have permission for this. If you think that is a mistake, contact the school office.';
  }
  if (status === 404) {
    return safe || 'We could not find that. Check the details, or contact the school office.';
  }
  if (status === 409) {
    return safe || 'This is already on the system. Sign in, or change the details and try again.';
  }
  if (status === 429) {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  if (status === 503 || status === 502 || status === 504) {
    return 'The school site is briefly unavailable. Wait a moment and try again. If it continues, contact the school office.';
  }
  if (status >= 500 || status === 0) {
    return 'Something went wrong on our side. Wait a moment and try again. If it continues, contact the school office during working hours.';
  }
  return safe || 'We could not complete that. Try again, or contact the school office if it keeps happening.';
}
