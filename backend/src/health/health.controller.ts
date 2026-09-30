import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public liveness check (no dependency details)' })
  check() {
    return this.healthService.live();
  }

  @Get('details')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SYSTEM_AUDITOR)
  @ApiOperation({ summary: 'Full dependency health for administrators' })
  details() {
    return this.healthService.check();
  }
}
