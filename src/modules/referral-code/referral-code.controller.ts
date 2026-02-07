import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Delete,
  Put,
  Req,
} from '@nestjs/common';
import { ReferralCodeService } from './referral-code.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateReferralCodeDto } from 'src/dtos/create-referral-code.dto';
import { UpdateReferralCodeDto } from 'src/dtos/update-referral-code.dto';

@ApiTags('Referral Code')
@Controller('referral-code')
export class ReferralCodeController {
  constructor(private readonly referralCodeService: ReferralCodeService) { }

  // ============= PUBLIC ENDPOINT =============

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Davet kodunu doğrula (kayıt öncesi kontrol)' })
  async validateCode(@Body('code') code: string) {
    try {
      await this.referralCodeService.validateCode(code);
      return { valid: true, message: 'Davet kodu geçerli.' };
    } catch {
      return { valid: false, message: 'Geçersiz veya kullanım hakkı dolmuş davet kodu.' };
    }
  }

  // ============= USER ENDPOINTS =============

  @Get('my-codes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kendi davet kodlarımı gör' })
  async getMyCodes(@Req() req: any) {
    return await this.referralCodeService.getUserReferralCodes(req.user.sub);
  }

  @Get('my-network')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kendi davet ağacımı gör (tree yapısında)' })
  async getMyNetwork(@Req() req: any) {
    return await this.referralCodeService.getMyReferralTree(req.user.sub);
  }

  @Post('generate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yeni davet kodu oluştur' })
  async generateCode(@Req() req: any) {
    return await this.referralCodeService.generateUserReferralCode(req.user.sub);
  }

  // ============= ADMIN ONLY ENDPOINTS =============

  @Get('admin/user-network/:userId')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Kullanıcının davet ağı (kim davet etti, kimi davet etti)' })
  async getUserNetwork(@Param('userId') userId: string) {
    return await this.referralCodeService.getUserReferralNetwork(userId);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tüm davet kodlarını listele (Sadece Admin)' })
  @ApiQuery({ name: '_start', required: false, description: 'Başlangıç index' })
  @ApiQuery({ name: '_end', required: false, description: 'Bitiş index' })
  @ApiQuery({ name: '_sort', required: false, description: 'Sıralama alanı' })
  @ApiQuery({ name: '_order', required: false, description: 'Sıralama yönü (asc/desc)' })
  @ApiQuery({ name: 'q', required: false, description: 'Arama' })
  async list(@Query() query: any) {
    return await this.referralCodeService.list(
      query,
      null,
      [{ path: 'createdBy', select: 'fullName phoneNumber' }],
      ['code', 'assignedTo'],
    );
  }

  @Get(':id/usage')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Davet kodu kullanım istatistikleri' })
  async getUsageStats(@Param('id') id: string) {
    return await this.referralCodeService.getCodeUsageStats(id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tek bir davet kodu getir' })
  async getOne(@Param('id') id: string) {
    return await this.referralCodeService.getCodeUsageStats(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Kurumsal davet kodu oluştur' })
  async createCorporate(@Body() dto: CreateReferralCodeDto, @Req() req: any) {
    return await this.referralCodeService.createCorporateCode(dto, req.user.sub);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Davet kodu güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateReferralCodeDto) {
    return await this.referralCodeService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Davet kodu sil' })
  async delete(@Param('id') id: string) {
    return await this.referralCodeService.delete(id);
  }
}
