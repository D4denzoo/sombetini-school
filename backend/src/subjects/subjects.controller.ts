import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all subjects' })
  findAll(@Query('isActive') isActive?: string) {
    return this.subjectsService.findAll(isActive === undefined ? undefined : isActive === 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create subject' })
  create(@Body() body: { name: string; code: string; description?: string; maxMarks?: number }) {
    return this.subjectsService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update subject' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.subjectsService.update(id, body as never);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate subject' })
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
