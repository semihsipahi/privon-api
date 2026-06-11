import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Role } from '../enums/role.enum';

export const RESOURCE_OWNER_KEY = 'resourceOwner';

export interface ResourceOwnerConfig {
  modelName: string; // MongoDB collection name (e.g., 'Restaurant')
  ownerField: string; // Field containing owner ID (e.g., 'owner')
  idParam?: string; // URL param name (default: 'id')
}

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectConnection() private connection: Connection,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<ResourceOwnerConfig>(
      RESOURCE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Decorator yoksa geç
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admin her zaman erişebilir
    if (user?.role === Role.SuperAdmin) {
      return true;
    }

    const resourceId = request.params[config.idParam || 'id'];
    if (!resourceId) {
      return true; // ID yoksa guard uygulanmaz
    }

    // MongoDB'den sadece owner alanını çek
    const model = this.connection.model(config.modelName);
    const resource = await model
      .findById(resourceId)
      .select(config.ownerField)
      .lean()
      .exec();

    if (!resource) {
      throw new ForbiddenException('Kaynak bulunamadı');
    }

    // Sahiplik kontrolü
    const ownerId = (resource as any)[config.ownerField]?.toString();
    if (ownerId !== user?.userId) {
      throw new ForbiddenException('Bu kaynağa erişim yetkiniz yok');
    }

    return true;
  }
}
