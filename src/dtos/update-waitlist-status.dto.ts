import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateWaitlistStatusDto {
  @IsIn(['pending', 'suitable', 'approved', 'rejected'])
  status: 'pending' | 'suitable' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  statusNote?: string;
}
