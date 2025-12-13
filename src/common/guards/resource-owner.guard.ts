import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';

export const RESOURCE_OWNER_KEY = 'resourceOwner';

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresOwnership = this.reflector.getAllAndOverride<boolean>(
      RESOURCE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresOwnership) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceUserId = request.params.id || request.params.userId;

    // Admin her zaman erişebilir
    if (user?.role === Role.SuperAdmin) {
      return true;
    }

    // Kullanıcı kendi kaynağına erişebilir
    // JWT strategy'den gelen user.userId ile kontrol ediyoruz
    return user?.userId === resourceUserId;
  }
}
