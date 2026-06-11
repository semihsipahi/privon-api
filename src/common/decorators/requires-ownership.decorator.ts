import { SetMetadata } from '@nestjs/common';
import {
  RESOURCE_OWNER_KEY,
  ResourceOwnerConfig,
} from '../guards/resource-owner.guard';

export const RequiresOwnership = (config: ResourceOwnerConfig) =>
  SetMetadata(RESOURCE_OWNER_KEY, config);
