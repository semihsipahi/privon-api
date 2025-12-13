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
import { ReviewService } from './review.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CreateReviewDto } from 'src/dtos/create-review.dto';
import { UpdateReviewDto } from 'src/dtos/update-review.dto';
import { ReplyReviewDto } from 'src/dtos/reply-review.dto';

@ApiTags('Review')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Refine getList endpoint
   * GET /review?_start=0&_end=10&_sort=createdAt&_order=desc
   * Response: { data: Review[], total: number }
   */
  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({ summary: 'Yorumları listele (Refine uyumlu)' })
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
    return await this.reviewService.list(query);
  }

  /**
   * Restorana ait yorumları listeleme
   * GET /review/restaurant/:restaurantId
   */
  @Get('restaurant/:restaurantId')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({
    summary: 'Restorana ait yorumları listele',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restoran ID' })
  @ApiQuery({
    name: '_start',
    required: false,
    description: 'Başlangıç index (varsayılan: 0)',
  })
  @ApiQuery({
    name: '_end',
    required: false,
    description: 'Bitiş index (varsayılan: 10)',
  })
  async getByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('_start') _start?: number,
    @Query('_end') _end?: number,
  ) {
    return await this.reviewService.findByRestaurant(
      restaurantId,
      _start,
      _end,
    );
  }

  /**
   * Restoranın ortalama puanını getir
   * GET /review/restaurant/:restaurantId/average
   */
  @Get('restaurant/:restaurantId/average')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({
    summary: 'Restoranın ortalama puanını ve toplam yorum sayısını getir',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restoran ID' })
  async getAverageRating(@Param('restaurantId') restaurantId: string) {
    return await this.reviewService.getAverageRating(restaurantId);
  }

  /**
   * Kullanıcının yorumlarını listeleme
   * GET /review/my-reviews?_start=0&_end=10
   */
  @Get('my-reviews')
  @ApiBearerAuth()
  @Roles(Role.User, Role.SuperAdmin)
  @ApiOperation({
    summary: 'Kullanıcının kendi yorumlarını listele (Sayfalama destekli)',
  })
  @ApiQuery({
    name: '_start',
    required: false,
    description: 'Başlangıç index (varsayılan: 0)',
  })
  @ApiQuery({
    name: '_end',
    required: false,
    description: 'Bitiş index (varsayılan: 10)',
  })
  async getMyReviews(
    @Req() req: any,
    @Query('_start') _start?: number,
    @Query('_end') _end?: number,
  ) {
    return await this.reviewService.findByUser(req.user.userId, _start, _end);
  }

  /**
   * Refine getOne endpoint
   * GET /review/:id
   */
  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({ summary: 'Tek bir yorum getir' })
  async getOne(@Param('id') id: string) {
    return await this.reviewService.findByID(id);
  }

  /**
   * Refine create endpoint
   * POST /review
   * Sadece kupon kullanmış kullanıcılar yorum yapabilir
   */
  @Post()
  @ApiBearerAuth()
  @Roles(Role.User, Role.SuperAdmin)
  @ApiOperation({
    summary: 'Yeni bir yorum oluştur (Kullanıcı)',
  })
  async create(@Body() createReviewDto: CreateReviewDto, @Req() req: any) {
    return await this.reviewService.createReview(
      req.user.userId,
      createReviewDto,
    );
  }

  /**
   * Refine update endpoint
   * PUT /review/:id
   * Kullanıcı kendi yorumunu güncelleyebilir
   */
  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.SuperAdmin)
  @ApiOperation({
    summary: 'Yorum güncelle (Kullanıcı)',
  })
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req: any,
  ) {
    return await this.reviewService.updateReview(
      id,
      req.user.userId,
      updateReviewDto,
    );
  }

  /**
   * Restoran sahibi yoruma cevap verir
   * POST /review/:id/reply
   */
  @Post(':id/reply')
  @ApiBearerAuth()
  @Roles(Role.RestaurantOwner, Role.SuperAdmin)
  @ApiOperation({
    summary: 'Yoruma cevap ver (Restoran Sahibi)',
  })
  @ApiParam({ name: 'id', description: 'Yorum ID' })
  async reply(
    @Param('id') id: string,
    @Body() replyReviewDto: ReplyReviewDto,
    @Req() req: any,
  ) {
    return await this.reviewService.replyToReview(
      id,
      req.user.userId,
      replyReviewDto,
    );
  }

  /**
   * Refine delete endpoint
   * DELETE /review/:id
   * Kullanıcı kendi yorumunu silebilir
   */
  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.SuperAdmin)
  @ApiOperation({ summary: 'Yorum sil (Kullanıcı)' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return await this.reviewService.deleteReview(id, req.user.userId);
  }
}
