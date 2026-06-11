import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LegalService } from './legal.service';
import { LegalDocType } from '../../models/legal-document.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

class CreateLegalDocumentDto {
  type: LegalDocType;
  title: { tr: string; en: string; fr: string };
  content: { tr: string; en: string; fr: string };
  summary: { tr: string; en: string; fr: string };
  effectiveDate: Date;
  isActive?: boolean;
}

class UpdateLegalDocumentDto {
  title?: { tr: string; en: string; fr: string };
  content?: { tr: string; en: string; fr: string };
  summary?: { tr: string; en: string; fr: string };
  effectiveDate?: Date;
  isActive?: boolean;
}

@ApiTags('Legal Documents')
@ApiBearerAuth()
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('documents')
  @ApiOperation({ summary: 'Tüm yasal belgeleri listele' })
  async findAll() {
    return this.legalService.findAll();
  }

  @Get('documents/:type')
  @ApiOperation({ summary: 'Belirli tipteki son aktif belgeyi getir' })
  async findActiveByType(@Param('type') type: LegalDocType) {
    return this.legalService.findActiveByType(type);
  }

  @Get('documents/:type/version/:version')
  @ApiOperation({ summary: 'Belirli tipteki belirli versiyonu getir' })
  async findByTypeAndVersion(
    @Param('type') type: LegalDocType,
    @Param('version') version: number,
  ) {
    return this.legalService.findByTypeAndVersion(type, Number(version));
  }

  @Post('documents')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Yeni belge versiyonu oluştur (Admin)' })
  async create(@Body() dto: CreateLegalDocumentDto) {
    return this.legalService.create(dto);
  }

  @Put('documents/:id')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Belgeyi güncelle (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.legalService.update(id, dto);
  }

  @Delete('documents/:id')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Belgeyi sil (Admin)' })
  async remove(@Param('id') id: string) {
    return this.legalService.remove(id);
  }
}
