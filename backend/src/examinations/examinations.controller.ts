import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExaminationsService } from './examinations.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('examinations')
@Controller('examinations')
export class ExaminationsController {
  constructor(private examinationsService: ExaminationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List examinations with filtering' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
    @Query('classId') classId?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.examinationsService.findAll({
      page: +page, limit: +limit, academicYearId, termId, classId, type,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get examination by ID' })
  findOne(@Param('id') id: string) {
    return this.examinationsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create examination' })
  create(@Body() body: {
    name: string; type: string; academicYearId: string; termId: string;
    classId?: string; startDate: string; endDate: string; maxMarks?: number; description?: string;
  }) {
    return this.examinationsService.create({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update examination' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data: Record<string, unknown> = { ...body };
    if (body.startDate) data.startDate = new Date(body.startDate as string);
    if (body.endDate) data.endDate = new Date(body.endDate as string);
    return this.examinationsService.update(id, data as never);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Deactivate examination' })
  remove(@Param('id') id: string) {
    return this.examinationsService.remove(id);
  }
}
