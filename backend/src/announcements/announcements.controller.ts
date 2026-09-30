import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Public()
  @Get()
  findPublic(@Query('page') page = 1, @Query('limit') limit = 10, @Query('category') category?: string) {
    return this.announcementsService.findPublic(+page, +limit, category);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.announcementsService.findBySlug(slug);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return this.announcementsService.findAllAdmin(+page, +limit, status);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  create(@Body() body: {
    title: string; description: string; category: string;
    featuredImage?: string; expiresAt?: string; scheduledAt?: string;
  }, @CurrentUser() user: AuthUser) {
    return this.announcementsService.create({
      ...body,
      authorId: user.id,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Put(':id/publish')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  publish(@Param('id') id: string) {
    return this.announcementsService.publish(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.announcementsService.update(id, body as never);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
