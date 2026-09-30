import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('classes')
@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all classes' })
  findAll(@Query('isActive') isActive?: string) {
    return this.classesService.findAll(isActive === undefined ? undefined : isActive === 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get class by ID' })
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create class' })
  create(@Body() body: { name: string; level: number; section?: string; capacity?: number; description?: string }) {
    return this.classesService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update class' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.classesService.update(id, body as never);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate class' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
