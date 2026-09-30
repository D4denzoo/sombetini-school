import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/auth.decorators';
import { RoleName } from '../../common/constants/roles';
import { IS_PUBLIC_KEY } from '../../common/decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.roles) {
      throw new ForbiddenException('Huna ruhusa ya kufikia rasilimali hii');
    }

    const hasRole = requiredRoles.some(role => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Huna ruhusa ya kufikia rasilimali hii');
    }

    return true;
  }
}
