import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { ParentsService } from './parents.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';
import { UpdateParentDto } from './dto/update-parent.dto';

@ApiTags('parents')
@Controller('parents')
@ApiBearerAuth()
export class ParentsController {
  constructor(private parentsService: ParentsService) {}

  @Get()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'List all parents' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.parentsService.findAll(+page, +limit, search);
  }

  @Get('claims/pending')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'List pending parent–child claims for office review' })
  listPendingClaims() {
    return this.parentsService.listPendingClaims();
  }

  @Put('claims/:parentId/:studentId/approve')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Approve a pending child claim' })
  approveClaim(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.approveClaim(parentId, studentId, user);
  }

  @Put('claims/:parentId/:studentId/reject')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Reject a pending child claim' })
  rejectClaim(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reason?: string },
  ) {
    return this.parentsService.rejectClaim(parentId, studentId, user, body?.reason);
  }

  @Get('me/children')
  @Roles(RoleName.PARENT)
  @ApiOperation({ summary: 'Get my children' })
  getMyChildren(@CurrentUser() user: AuthUser) {
    if (!user.parentId) return [];
    return this.parentsService.getChildren(user.parentId, user);
  }

  @Post('me/children/claims')
  @Roles(RoleName.PARENT)
  @ApiOperation({ summary: 'Claim a child (pending until office approves)' })
  claimChild(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      registrationNo: string;
      firstName: string;
      lastName: string;
      gender: Gender;
      dateOfBirth: string;
      classId: string;
      relationship?: string;
    },
  ) {
    return this.parentsService.claimChild(user, body);
  }

  @Get(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.PARENT)
  @ApiOperation({ summary: 'Get parent by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.parentsService.findOne(id, user);
  }

  @Post()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create parent profile' })
  create(@Body() body: { userId: string; occupation?: string; address?: string; emergencyContact?: string; emergencyPhone?: string }) {
    return this.parentsService.create(body);
  }

  @Put(':id')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.PARENT)
  @ApiOperation({ summary: 'Update parent profile' })
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: UpdateParentDto) {
    return this.parentsService.update(id, body, user);
  }

  @Post(':id/children')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Link child to parent (office). Prefer parent self-claim + approval.' })
  linkChild(
    @Param('id') id: string,
    @Body() body: { studentId: string; relationship?: string; isPrimary?: boolean },
  ) {
    return this.parentsService.linkChild(id, body.studentId, body.relationship, body.isPrimary);
  }

  @Delete(':id/children/:studentId')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unlink child from parent' })
  unlinkChild(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.parentsService.unlinkChild(id, studentId);
  }

  @Get(':id/children')
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN, RoleName.ACADEMIC_ADMIN, RoleName.PARENT)
  @ApiOperation({ summary: 'Get parent children' })
  getChildren(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.parentsService.getChildren(id, user);
  }
}
