import { BadRequestException } from '@nestjs/common';
import { Matches, MinLength } from 'class-validator';

/** New passwords: 10+ chars with upper, lower, and a digit. Existing shorter logins still work. */
export const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\S]{10,128}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 10 characters and include uppercase, lowercase, and a number.';

export function assertStrongPassword(password: string) {
  if (!STRONG_PASSWORD.test(password)) {
    throw new BadRequestException(STRONG_PASSWORD_MESSAGE);
  }
}

export const StrongPassword = () => Matches(STRONG_PASSWORD, { message: STRONG_PASSWORD_MESSAGE });

export const LoginPassword = () => MinLength(8, { message: 'Password is required' });
