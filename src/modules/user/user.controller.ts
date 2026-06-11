import {
  BadRequestException,
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
import { ReferralCodeService } from '../referral-code/referral-code.service';
import { UploadService } from '../upload/upload.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
  ChangeUserStatusDto,
  CreateAdminUserDto,
} from 'src/dtos';
import { CustomException } from 'src/common/exceptions/custom.exception';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly referralCodeService: ReferralCodeService,
    private readonly uploadService: UploadService,
  ) {}

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

  @Post('me/image')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Profil fotoğrafı yükle ve kaydet' })
  async uploadProfileImage(@Req() req: any) {
    const data = await (req as any).file();
    if (!data) throw new BadRequestException('Dosya bulunamadı');

    const buffer = await data.toBuffer();
    const file = {
      buffer,
      originalname: data.filename || 'profile.jpg',
      mimetype: data.mimetype,
    };

    const imageUrl = await this.uploadService.uploadFile(file as any);
    return await this.userService.updateProfile(req.user.userId, { imageUrl });
  }

  @Delete('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hesabı kalıcı olarak anonimleştir (KVKK)' })
  async anonymizeMe(@Req() req: any) {
    return await this.userService.anonymizeUser(req.user.userId);
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
      [{ path: 'referredBy', select: 'fullName maskedName' }], // referredBy bilgileri gelsin
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
    const user = await this.userService.findByID(id, { password: 0 });
    let networkTree = null;
    try {
      networkTree = await this.referralCodeService.getMyReferralTree(id);
    } catch (error) {
      // Return user without network tree if fetching tree fails
    }

    return {
      ...((user as any)?.toObject ? (user as any).toObject() : user),
      networkTree,
    };
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

  @Post('admin-create')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary:
      'Admin: Telefon numarasıyla kullanıcı oluştur (şifresiz, ilk girişte kurulum)',
  })
  async adminCreate(@Body() dto: CreateAdminUserDto) {
    return await this.userService.adminCreateUser(dto);
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

  @Put(':id/ban')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Kullanıcıyı bloke et (SuperAdmin)',
    description:
      'Kullanıcıyı belirtilen süre veya tarihe kadar bloke eder (ör: 1w, 1m, permanent veya ISO tarih).',
  })
  @ApiQuery({
    name: 'duration',
    required: true,
    description: 'Süre veya tarih (ör: 1w, 1m, permanent veya 2024-12-31)',
  })
  async ban(@Param('id') id: string, @Query('duration') duration: string) {
    return await this.userService.banUser(id, duration);
  }

  @Put(':id/unban')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Kullanıcı blokesini kaldır (SuperAdmin)',
    description:
      'Kullanıcının blokesini kaldırır ve no-show geçmişini sıfırlar.',
  })
  async unban(@Param('id') id: string) {
    return await this.userService.unbanUser(id);
  }

  @Post(':id/reset-legal-consent')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Kullanıcının tüm yasal onaylarını sıfırla',
    description:
      'Kullanıcının terms, privacy, explicit consent, cookie policy, commercial consent onaylarını temizler. Mobilde tekrar onay akışına yönlendirilir.',
  })
  async resetLegalConsent(@Param('id') id: string) {
    return await this.userService.resetLegalConsent(id);
  }
}
