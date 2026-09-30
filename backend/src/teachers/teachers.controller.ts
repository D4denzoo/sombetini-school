import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@ApiTags('teachers')
@Controller('teachers')
@ApiBearerAuth()
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'List all teachers' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.teachersService.findAll(+page, +limit, search, isActive === undefined ? undefined : isActive === 'true');
  }

  @Get('me/assignments')
  @Roles(RoleName.TEACHER)
  @ApiOperation({ summary: 'Get my class assignments' })
  getMyAssignments(@CurrentUser() user: AuthUser) {
    if (!user.teacherId) return [];
    return this.teachersService.getAssignments(user.teacherId, user);
  }

  @Get(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.TEACHER)
  @ApiOperation({ summary: 'Get teacher by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teachersService.findOne(id, user);
  }

  @Post()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create teacher profile' })
  create(@Body() body: { userId: string; staffNo: string; qualification?: string; specialization?: string; joinDate: string }) {
    return this.teachersService.create({ ...body, joinDate: new Date(body.joinDate) });
  }

  @Put(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update teacher profile' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.teachersService.update(id, body as never);
  }

  @Post(':id/assignments')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Assign teacher to class and subject' })
  assignToClass(@Param('id') id: string, @Body() body: { classId: string; subjectId: string }) {
    return this.teachersService.assignToClass(id, body.classId, body.subjectId);
  }

  @Delete('assignments/:assignmentId')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Remove teacher assignment' })
  removeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.teachersService.removeAssignment(assignmentId);
  }

  @Get(':id/assignments')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.TEACHER)
  @ApiOperation({ summary: 'Get teacher assignments' })
  getAssignments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teachersService.getAssignments(id, user);
  }
}
