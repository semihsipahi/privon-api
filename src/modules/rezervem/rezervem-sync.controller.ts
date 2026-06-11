import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { RezervemHttpService } from './rezervem-http.service';
import { RezervemVenueService } from './rezervem-venue.service';
import { ImportRezervemVenueDto } from 'src/dtos/import-rezervem-venue.dto';

@ApiTags('Rezervem Admin')
@ApiBearerAuth()
@Controller('admin/rezervem')
export class RezervemSyncController {
  constructor(
    private readonly venueService: RezervemVenueService,
    private readonly http: RezervemHttpService,
  ) {}

  // ── Sync & status ─────────────────────────────────────────────────

  @Get('status')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Rezervem cache durumu (toplam mekan, son sync vb.)',
  })
  status() {
    return this.venueService.getStatus();
  }

  @Post('sync')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Rezervem mekanlarını manuel tetiklenen sync ile çek',
  })
  async sync() {
    return this.venueService.syncAll();
  }

  // ── Venue listesi ve detayı ───────────────────────────────────────

  @Get('venues')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Rezervem cache mekan listesi (sayfalı, filtrelenebilir)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'İsme göre arama',
  })
  @ApiQuery({
    name: 'categoryKey',
    required: false,
    type: String,
    description: 'Kategori anahtarı',
  })
  async listVenues(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('q') q?: string,
    @Query('categoryKey') categoryKey?: string,
  ) {
    return this.venueService.listForAdmin({
      page: +page,
      pageSize: +pageSize,
      q,
      categoryKey,
    });
  }

  @Get('venues/:slug')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Rezervem venue detayı — alanlar (areas), etiketler dahil',
  })
  @ApiParam({ name: 'slug', description: "Mekan slug'u", example: 'neolokal' })
  async getVenue(@Param('slug') slug: string) {
    return this.venueService.getBySlugForAdmin(slug);
  }

  // ── Import ────────────────────────────────────────────────────────

  @Post('venues/:slug/import')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Rezervem mekanını kendi Restaurant koleksiyonuna aktar',
    description:
      "Rezervem cache'indeki mekanı, özelleştirilebilir bilgilerle birlikte " +
      '`restaurants` koleksiyonuna ekler. Mekan varsayılan olarak pasif (isActive=false) ' +
      'oluşturulur; admin aktifleştirmeden önce düzenleyebilir.',
  })
  @ApiParam({ name: 'slug', description: "Mekan slug'u", example: 'neolokal' })
  async importVenue(
    @Param('slug') slug: string,
    @Body() dto: ImportRezervemVenueDto,
    @Request() req: any,
  ) {
    return this.venueService.importToRestaurant(slug, req.user.userId, dto);
  }

  // ── Image proxy ───────────────────────────────────────────────────

  @Get('image')
  @Public()
  @ApiOperation({
    summary:
      'Rezervem CDN görseli proxy — tarayıcı <img> için auth header ekler',
    description:
      "Rezervem CDN URL'sini alır, Bearer token + Referer ile sunucu tarafında çeker, " +
      "tarayıcıya aktarır. Sadece rezervem.com.tr domain'lerine izin verilir.",
  })
  @ApiQuery({
    name: 'url',
    required: true,
    type: String,
    description: 'Rezervem CDN URL (URL-encoded)',
  })
  async proxyImage(@Query('url') url: string, @Res() reply: FastifyReply) {
    if (!url) {
      reply.code(400).send('url parametresi zorunlu');
      return;
    }

    try {
      const { buffer, contentType } = await this.http.fetchImage(url);
      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'public, max-age=86400');
      reply.send(buffer);
    } catch (err: any) {
      reply.code(502).send({ error: err?.message ?? 'Image proxy failed' });
    }
  }

  // ── Debug: canlı bootstrap ────────────────────────────────────────

  @Get('venues/:slug/bootstrap-raw')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: "Rezervem API'den canlı bootstrap çek (cache bypass)",
    description:
      "Rezervem Partner API'sine doğrudan istek atar (MongoDB cache atlanır). " +
      "İmaj URL'lerini ve gerçek veri yapısını debug etmek için kullanın.",
  })
  @ApiParam({ name: 'slug', description: "Mekan slug'u", example: 'neolokal' })
  async rawBootstrap(@Param('slug') slug: string) {
    return this.http.getBootstrap(slug);
  }
}
