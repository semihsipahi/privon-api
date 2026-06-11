import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LegalService } from './legal.service';
import { LegalDocType } from '../../models/legal-document.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

class CreateLegalDocumentTranslationDto {
  @ApiProperty({ example: 'Türkçe' })
  @IsString({ message: 'tr alanı metin olmalıdır' })
  tr: string;

  @ApiProperty({ example: 'English' })
  @IsString({ message: 'en alanı metin olmalıdır' })
  en: string;

  @ApiProperty({ example: 'Français' })
  @IsString({ message: 'fr alanı metin olmalıdır' })
  fr: string;
}

class UpdateLegalDocumentTranslationDto {
  @ApiProperty({ example: 'Türkçe' })
  @IsOptional()
  @IsString({ message: 'tr alanı metin olmalıdır' })
  tr?: string;

  @ApiProperty({ example: 'English' })
  @IsOptional()
  @IsString({ message: 'en alanı metin olmalıdır' })
  en?: string;

  @ApiProperty({ example: 'Français' })
  @IsOptional()
  @IsString({ message: 'fr alanı metin olmalıdır' })
  fr?: string;
}

class CreateLegalDocumentDto {
  @ApiProperty({ enum: LegalDocType })
  @IsEnum(LegalDocType, { message: 'Geçersiz belge türü' })
  type: LegalDocType;

  @ApiProperty({ type: CreateLegalDocumentTranslationDto })
  @ValidateNested({ message: 'title geçersiz formatta' })
  @Type(() => CreateLegalDocumentTranslationDto)
  title: CreateLegalDocumentTranslationDto;

  @ApiProperty({ type: CreateLegalDocumentTranslationDto })
  @ValidateNested({ message: 'content geçersiz formatta' })
  @Type(() => CreateLegalDocumentTranslationDto)
  content: CreateLegalDocumentTranslationDto;

  @ApiProperty({ type: CreateLegalDocumentTranslationDto })
  @ValidateNested({ message: 'summary geçersiz formatta' })
  @Type(() => CreateLegalDocumentTranslationDto)
  summary: CreateLegalDocumentTranslationDto;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'effectiveDate geçerli bir tarih olmalıdır' })
  effectiveDate: Date;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive boolean olmalıdır' })
  isActive?: boolean;
}

class UpdateLegalDocumentDto {
  @ApiProperty({ required: false, type: UpdateLegalDocumentTranslationDto })
  @IsOptional()
  @ValidateNested({ message: 'title geçersiz formatta' })
  @Type(() => UpdateLegalDocumentTranslationDto)
  title?: UpdateLegalDocumentTranslationDto;

  @ApiProperty({ required: false, type: UpdateLegalDocumentTranslationDto })
  @IsOptional()
  @ValidateNested({ message: 'content geçersiz formatta' })
  @Type(() => UpdateLegalDocumentTranslationDto)
  content?: UpdateLegalDocumentTranslationDto;

  @ApiProperty({ required: false, type: UpdateLegalDocumentTranslationDto })
  @IsOptional()
  @ValidateNested({ message: 'summary geçersiz formatta' })
  @Type(() => UpdateLegalDocumentTranslationDto)
  summary?: UpdateLegalDocumentTranslationDto;

  @ApiProperty({ required: false, example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'effectiveDate geçerli bir tarih olmalıdır' })
  effectiveDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean({ message: 'isActive boolean olmalıdır' })
  isActive?: boolean;
}

@ApiTags('Legal Documents')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('documents')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tüm yasal belgeleri listele (Admin)' })
  async findAll() {
    return this.legalService.findAll();
  }

  @Public()
  @Get('documents/:type')
  @ApiOperation({ summary: 'Belirli tipteki son aktif belgeyi getir (Public)' })
  async findActiveByType(@Param('type') type: LegalDocType) {
    return this.legalService.findActiveByType(type);
  }

  @Public()
  @Get('documents/:type/version/:version')
  @ApiOperation({ summary: 'Belirli tipteki belirli versiyonu getir (Public)' })
  async findByTypeAndVersion(
    @Param('type') type: LegalDocType,
    @Param('version') version: number,
  ) {
    return this.legalService.findByTypeAndVersion(type, Number(version));
  }

  @Post('documents')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Yeni belge versiyonu oluştur (Admin)' })
  async create(@Body() dto: CreateLegalDocumentDto) {
    return this.legalService.create(dto as any);
  }

  @Put('documents/:id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Belgeyi güncelle (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateLegalDocumentDto) {
    return this.legalService.update(id, dto as any);
  }

  @Delete('documents/:id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Belgeyi sil (Admin)' })
  async remove(@Param('id') id: string) {
    return this.legalService.remove(id);
  }
}
