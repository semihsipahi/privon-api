import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly roleCompatibilityMap: Record<Role, Role[]> = {
    [Role.SuperAdmin]: [Role.SuperAdmin],
    [Role.RestaurantOwner]: [Role.RestaurantOwner],
    [Role.User]: [Role.User, Role.TrialUser, Role.PremiumUser, Role.RestaurantOwner],
    [Role.PremiumUser]: [Role.PremiumUser],
    [Role.TrialUser]: [Role.TrialUser],
  };

  constructor(private reflector: Reflector) {}

  private toRoleList(role: Role | Role[] | undefined): Role[] {
    if (!role) return [];
    return Array.isArray(role) ? role : [role];
  }

  private hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
    const compatibleRoles =
      this.roleCompatibilityMap[requiredRole] || [requiredRole];
    return compatibleRoles.includes(userRole);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const userRoles = this.toRoleList(user?.role as Role | Role[] | undefined);

    return requiredRoles.some((requiredRole) =>
      userRoles.some((userRole) => this.hasRequiredRole(userRole, requiredRole)),
    );
  }
}
