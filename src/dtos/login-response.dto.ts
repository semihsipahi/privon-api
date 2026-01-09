import { Role } from 'src/common/enums/role.enum';

export class LoginResponseDto {
  accessToken: string;
  fullName: string;
  email: string;
  role: Role;
  imageUrl: string;
  restaurant?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}
