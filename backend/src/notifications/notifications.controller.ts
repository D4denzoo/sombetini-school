import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  findMine(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(user.id, +page, +limit, unreadOnly === 'true');
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.remove(id, user.id);
  }

  @Post('send')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send notification to users (admin). Email/SMS copies go through the queue.' })
  send(@Body() body: { userIds: string[]; type: NotificationType; title: string; message: string; data?: Record<string, unknown> }) {
    return this.notificationsService.createBulk(body.userIds, {
      type: body.type,
      title: body.title,
      message: body.message,
      data: body.data,
    });
  }

  @Post('broadcast')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send one notice to every active user with the given roles (e.g. all parents)' })
  broadcast(@Body() body: { roles: string[]; type: NotificationType; title: string; message: string; data?: Record<string, unknown> }) {
    return this.notificationsService.broadcast(body.roles, {
      type: body.type,
      title: body.title,
      message: body.message,
      data: body.data,
    });
  }
}
