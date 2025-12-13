import { SetMetadata } from '@nestjs/common';
import { RESOURCE_OWNER_KEY } from '../guards/resource-owner.guard';

export const ResourceOwner = () => SetMetadata(RESOURCE_OWNER_KEY, true);
