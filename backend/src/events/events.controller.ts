import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published events' })
  findPublic(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.eventsService.findPublic(
      +page, +limit, category,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'List all events (admin)' })
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 20, @Query('category') category?: string) {
    return this.eventsService.findAllAdmin(+page, +limit, category);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findPublished(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create event' })
  create(@Body() body: {
    title: string; description?: string; category: string;
    startDate: string; endDate?: string; location?: string;
    isAllDay?: boolean; isRecurring?: boolean; recurrenceRule?: string; isPublished?: boolean;
  }) {
    return this.eventsService.create({
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update event' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data: Record<string, unknown> = { ...body };
    if (body.startDate) data.startDate = new Date(body.startDate as string);
    if (body.endDate) data.endDate = new Date(body.endDate as string);
    return this.eventsService.update(id, data as never);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete event' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
