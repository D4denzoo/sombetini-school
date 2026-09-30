import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('admin')
@Controller('audit-logs')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SYSTEM_AUDITOR)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.findAll(+page, +limit, { module, action, userId });
  }
}
