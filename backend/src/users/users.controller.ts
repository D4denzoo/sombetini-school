import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles, Permissions } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all users (admin)' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(+page, +limit, status, search);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List available roles' })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create an active parent or teacher account' })
  provision(@Body() body: {
    email: string; password: string; firstName: string; lastName: string; phone?: string;
    kind: 'PARENT' | 'TEACHER'; staffNo?: string;
  }) {
    return this.usersService.provision(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id/verify-email')
  @ApiOperation({ summary: 'Confirm a parent email from the office' })
  verifyEmail(@Param('id') id: string) {
    return this.usersService.verifyEmail(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update user status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: UserStatus }) {
    return this.usersService.updateStatus(id, body.status);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  assignRoles(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { roleIds: string[] }) {
    return this.usersService.assignRoles(id, body.roleIds, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a parent account. Pupils and fee records are kept.' })
  removeParent(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.removeParentAccount(id, user);
  }
}
