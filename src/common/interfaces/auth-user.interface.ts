import { Role } from '../enums/role.enum';

export interface AuthUser {
    userId: string;
    role: Role;
    restaurantId?: string;
}
