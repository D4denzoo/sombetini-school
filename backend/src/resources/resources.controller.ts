import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('resources')
@Controller('resources')
@ApiBearerAuth()
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List learning resources' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('resourceType') resourceType?: string,
    @Query('subjectId') subjectId?: string,
    @Query('classLevel') classLevel?: number,
    @Query('topic') topic?: string,
  ) {
    return this.resourcesService.findAll({
      page: +page, limit: +limit, resourceType, subjectId,
      classLevel: classLevel ? +classLevel : undefined, topic,
    });
  }

  @Get(':id')
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get resource by ID' })
  findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Get(':id/download')
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download resource' })
  download(@Param('id') id: string) {
    return this.resourcesService.download(id);
  }

  @Post()
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create learning resource' })
  create(@Body() body: {
    title: string; description?: string; resourceType: string; subjectId?: string;
    classLevel?: number; topic?: string; academicYear?: string;
    fileName?: string; fileUrl?: string; externalUrl?: string;
    fileSize?: number; mimeType?: string; isPublished?: boolean;
  }) {
    return this.resourcesService.create(body);
  }

  @Put(':id')
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update learning resource' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.resourcesService.update(id, body as never);
  }

  @Delete(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Delete learning resource' })
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
