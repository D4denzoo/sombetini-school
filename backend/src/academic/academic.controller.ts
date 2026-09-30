import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('academic')
@Controller('academic')
export class AcademicController {
  constructor(private academicService: AcademicService) {}

  @Public()
  @Get('years')
  @ApiOperation({ summary: 'List academic years' })
  findAllYears() {
    return this.academicService.findAllYears();
  }

  @Public()
  @Get('years/current')
  @ApiOperation({ summary: 'Get current academic year' })
  findCurrentYear() {
    return this.academicService.findCurrentYear();
  }

  @Post('years')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create academic year' })
  createYear(@Body() body: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) {
    return this.academicService.createYear({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Put('years/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update academic year' })
  updateYear(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data: Record<string, unknown> = { ...body };
    if (body.startDate) data.startDate = new Date(body.startDate as string);
    if (body.endDate) data.endDate = new Date(body.endDate as string);
    return this.academicService.updateYear(id, data as never);
  }

  @Put('years/:id/current')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Set current academic year' })
  setCurrentYear(@Param('id') id: string) {
    return this.academicService.setCurrentYear(id);
  }

  @Delete('years/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete academic year' })
  removeYear(@Param('id') id: string) {
    return this.academicService.removeYear(id);
  }

  @Public()
  @Get('terms')
  @ApiOperation({ summary: 'List terms' })
  findTerms(@Query('academicYearId') academicYearId?: string) {
    return this.academicService.findTerms(academicYearId);
  }

  @Public()
  @Get('terms/current')
  @ApiOperation({ summary: 'Get current term' })
  findCurrentTerm() {
    return this.academicService.findCurrentTerm();
  }

  @Post('terms')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create term' })
  createTerm(@Body() body: { academicYearId: string; name: string; termNumber: number; startDate: string; endDate: string; isCurrent?: boolean }) {
    return this.academicService.createTerm({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Put('terms/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update term' })
  updateTerm(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data: Record<string, unknown> = { ...body };
    if (body.startDate) data.startDate = new Date(body.startDate as string);
    if (body.endDate) data.endDate = new Date(body.endDate as string);
    return this.academicService.updateTerm(id, data as never);
  }

  @Put('terms/:id/current')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Set current term' })
  setCurrentTerm(@Param('id') id: string) {
    return this.academicService.setCurrentTerm(id);
  }

  @Delete('terms/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete term' })
  removeTerm(@Param('id') id: string) {
    return this.academicService.removeTerm(id);
  }
}
