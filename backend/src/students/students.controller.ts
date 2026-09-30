import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';
import { StudentsService } from './students.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@ApiTags('students')
@Controller('students')
@ApiBearerAuth()
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.TEACHER, RoleName.SYSTEM_AUDITOR)
  @ApiOperation({ summary: 'List students with pagination and search' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
  ) {
    return this.studentsService.findAll(+page, +limit, search, classId, status);
  }

  @Get('registration/:registrationNo')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.TEACHER)
  @ApiOperation({ summary: 'Find student by registration number' })
  findByRegistrationNo(@Param('registrationNo') registrationNo: string) {
    return this.studentsService.findByRegistrationNo(registrationNo);
  }

  @Get(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.TEACHER, RoleName.PARENT)
  @ApiOperation({ summary: 'Get student by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.findOne(id, user);
  }

  @Post()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Create student' })
  create(@Body() body: {
    registrationNo: string; firstName: string; lastName: string; gender: Gender;
    dateOfBirth: string; classId: string; admissionDate: string;
    photoUrl?: string; address?: string; bloodGroup?: string; medicalNotes?: string;
  }) {
    return this.studentsService.create({
      ...body,
      dateOfBirth: new Date(body.dateOfBirth),
      admissionDate: new Date(body.admissionDate),
    });
  }

  @Put(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Update student' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data: Record<string, unknown> = { ...body };
    if (body.dateOfBirth) data.dateOfBirth = new Date(body.dateOfBirth as string);
    return this.studentsService.update(id, data as never);
  }

  @Delete(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete student' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
