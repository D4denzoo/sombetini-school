import { Controller, Post, Body, Get, Req, Res, HttpCode, HttpStatus, Delete, Param, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import {
  LoginDto, RegisterDto, RefreshTokenDto, Verify2FADto,
  Enable2FADto, ChangePasswordDto, InitialSetupDto, ForgotPasswordDto, ResetPasswordDto,
  VerifyEmailDto, ResendVerificationDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { REFRESH_COOKIE, clearAuthCookies, cookieFromRequest, setAuthCookies } from './auth-cookies';

type TokenPair = { accessToken?: string; refreshToken?: string; requires2FA?: boolean; tempToken?: string; sessionId?: string };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessions: SessionService,
    private config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.ip, req.headers['user-agent']);
    return this.seal(res, result as TokenPair);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register parent account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and get a new access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = dto.refreshToken || cookieFromRequest(req, REFRESH_COOKIE);
    if (!token) throw new UnauthorizedException('Session expired. Please sign in again.');
    const result = await this.authService.refreshToken(token, req.ip, req.headers['user-agent']);
    return this.seal(res, result as TokenPair);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a parent email address with the token from the email' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a fresh email confirmation link' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code' })
  async verify2FA(@Body() dto: Verify2FADto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verify2FA(dto.code, dto.tempToken!, req.ip, req.headers['user-agent']);
    return this.seal(res, result as TokenPair);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password with a reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('setup-status')
  @ApiOperation({ summary: 'Whether the first administrator still needs to be created' })
  setupStatus() {
    return this.authService.setupStatus();
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('setup')
  @ApiOperation({ summary: 'Initial system setup' })
  initialSetup(@Body() dto: InitialSetupDto) {
    return this.authService.initialSetup(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup authenticator-app 2FA' })
  setup2FA(@CurrentUser() user: AuthUser, @Body() dto: Enable2FADto) {
    return this.authService.setup2FA(user.id, dto.method);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA' })
  enable2FA(@CurrentUser() user: AuthUser, @Body() dto: Verify2FADto & Enable2FADto) {
    return this.authService.enable2FA(user.id, dto.code, dto.method);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  disable2FA(@CurrentUser() user: AuthUser, @Body() dto: Verify2FADto) {
    return this.authService.disable2FA(user.id, dto.code);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out this device' })
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(user.id, user.sessionId);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out on every device' })
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logoutAll(user.id);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List devices currently signed in to this account' })
  listSessions(@CurrentUser() user: AuthUser) {
    return this.authService.listSessions(user.id);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out one device' })
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const sessions = await this.sessions.listSessions(user.id);
    if (!sessions.some((session) => session.id === id)) {
      return { message: 'Session not found' };
    }
    await this.sessions.revoke(id);
    await this.sessions.markSessionClosed(id);
    return { message: 'Device signed out' };
  }

  /** Put JWTs in httpOnly cookies and keep them out of the JSON body. */
  private seal(res: Response, result: TokenPair) {
    if (result?.accessToken && result?.refreshToken) {
      setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken }, this.config);
      return { authenticated: true };
    }
    return result;
  }
}
