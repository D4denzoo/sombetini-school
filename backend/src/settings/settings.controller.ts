import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SettingsService } from './settings.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('contact')
  @ApiOperation({ summary: 'Submit the public contact form' })
  createContact(@Body() body: { name: string; email: string; phone?: string; subject: string; message: string }) {
    return this.settingsService.createContactMessage(body);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public school info, stats, and leadership (cached)' })
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get dynamic school statistics' })
  getStats() {
    return this.settingsService.getStats();
  }

  @Get()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get school settings (admin)' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update school settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateSettings(body);
  }

  @Get('leadership')
  @Public()
  @ApiOperation({ summary: 'List school leadership' })
  findAllLeadership() {
    return this.settingsService.findPublicLeadership();
  }

  @Get('leadership/:id')
  @Public()
  @ApiOperation({ summary: 'Get leadership member' })
  findLeadership(@Param('id') id: string) {
    return this.settingsService.findPublicLeader(id);
  }

  @Post('leadership')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create leadership member' })
  createLeadership(@Body() body: {
    name: string; position: string; positionSw?: string; photoUrl?: string;
    welcomeMessage?: string; biography?: string; email?: string; phone?: string;
    sortOrder?: number; isHead?: boolean; isActive?: boolean;
  }) {
    return this.settingsService.createLeadership(body);
  }

  @Put('leadership/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update leadership member' })
  updateLeadership(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateLeadership(id, body as never);
  }

  @Delete('leadership/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete leadership member' })
  removeLeadership(@Param('id') id: string) {
    return this.settingsService.removeLeadership(id);
  }
}
