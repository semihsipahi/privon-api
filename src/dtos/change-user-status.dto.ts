import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from 'src/common/enums/user-status.enum';

export class ChangeUserStatusDto {
    @ApiProperty({
        description: 'Yeni kullanıcı durumu',
        enum: UserStatus,
        example: UserStatus.Banned,
        required: true,
    })
    @IsEnum(UserStatus, { message: 'Geçersiz kullanıcı durumu.' })
    @IsNotEmpty()
    status: UserStatus;
}
