import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Put,
  Delete,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto, ChangeUserStatusDto } from 'src/dtos';
import { CustomException } from 'src/common/exceptions/custom.exception';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) { }

  /**
   * Get current user info
   * GET /user/me
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgilerini getir' })
  async getMe(@Req() req: any) {
    return await this.userService.getMe(req.user.userId);
  }


  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı profilini güncelle' })
  async updateMe(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return await this.userService.updateProfile(
      req.user.userId,
      updateProfileDto,
    );
  }

  @Delete('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı hesabını sil' })
  async deleteMe(@Req() req: any) {
    return await this.userService.delete(req.user.userId);
  }

  /**
   * Refine getList endpoint
   * GET /user?_start=0&_end=10&_sort=createdAt&_order=desc&name_like=john
   * Response: { data: User[], total: number }
   */
  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.User)
  @ApiOperation({ summary: 'Kullanıcıları listele (Refine uyumlu)' })
  @ApiQuery({
    name: '_start',
    required: false,
    description: 'Başlangıç index (0-tabanlı)',
  })
  @ApiQuery({
    name: '_end',
    required: false,
    description: 'Bitiş index (hariç)',
  })
  @ApiQuery({
    name: '_sort',
    required: false,
    description: 'Sıralama alanı (örn: createdAt)',
  })
  @ApiQuery({
    name: '_order',
    required: false,
    description: 'Sıralama yönü (asc/desc)',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Genel arama' })
  async list(@Query() query: any) {
    return await this.userService.list(
      query,
      { password: 0 }, // Şifreyi response'a dahil etme
    );
  }

  /**
   * Refine getOne endpoint
   * GET /user/:id
   */
  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.User)
  @ApiOperation({ summary: 'Tek bir kullanıcı getir' })
  async getOne(@Param('id') id: string) {
    return await this.userService.findByID(id, { password: 0 });
  }

  /**
   * Refine create endpoint
   * POST /user
   */
  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Yeni bir kullanıcı oluştur' })
  async create(@Body() createUserDto: CreateUserDto) {
    if (createUserDto.role === Role.SuperAdmin) {
      throw new CustomException('Süper admin eklenemez', 400);
    }
    return await this.userService.create(createUserDto);
  }

  /**
   * Refine update endpoint
   * PATCH /user/:id
   */
  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Kullanıcı güncelle' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(id, updateUserDto);
  }

  /**
   * Refine delete endpoint
   * DELETE /user/:id
   */
  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Kullanıcı sil' })
  async delete(@Param('id') id: string) {
    return await this.userService.delete(id);
  }
}
