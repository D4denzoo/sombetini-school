import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrongPassword } from '../password-policy';

export class LoginDto {
  @ApiProperty({ example: 'parent@school.ac.tz' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Parent@2026!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @StrongPassword()
  password: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Must be true — acceptance of Terms of Use and Privacy Policy' })
  @Equals(true, { message: 'You must accept the Terms of Use and Privacy Policy.' })
  acceptTerms: boolean;
}

export class RefreshTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class Verify2FADto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tempToken?: string;
}

export class Enable2FADto {
  @ApiProperty({ enum: ['TOTP'] })
  @IsIn(['TOTP'])
  method: 'TOTP';
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @StrongPassword()
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @StrongPassword()
  newPassword: string;
}

export class InitialSetupDto {
  @ApiProperty()
  @IsString()
  schoolName: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  adminEmail: string;

  @ApiProperty()
  @IsString()
  @StrongPassword()
  adminPassword: string;

  @ApiProperty()
  @IsString()
  adminFirstName: string;

  @ApiProperty()
  @IsString()
  adminLastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mission?: string;
}
