import {
    Body,
    Controller,
    Get,
    Post,
    Param,
    Put,
    Request,
    UseGuards,
    Query,
    Delete,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { CreateReviewDto } from 'src/dtos/create-review.dto';
import { UpdateReviewDto } from 'src/dtos/update-review.dto';
import { ReplyReviewDto } from 'src/dtos/reply-review.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Review')
@Controller('review')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @Post()
    @ApiBearerAuth()
    @Roles(Role.User)
    @ApiOperation({ summary: 'Değerlendirme yap (Onay bekler)' })
    async create(@Body() createDto: CreateReviewDto, @Request() req: any) {
        return await this.reviewService.createReview(createDto, req.user);
    }

    @Get('pending')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Onay bekleyen değerlendirmeler (Admin)' })
    async getPending() {
        return await this.reviewService.getPendingReviews();
    }

    @Put(':id/approve')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Değerlendirmeyi onayla (Admin)' })
    async approve(@Param('id') id: string) {
        return await this.reviewService.approveReview(id);
    }

    @Post(':id/reply')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({ summary: 'Değerlendirmeye yanıt ver (Restoran Sahibi)' })
    async reply(
        @Param('id') id: string,
        @Body() replyDto: ReplyReviewDto,
        @Request() req: any,
    ) {
        return await this.reviewService.replyToReview(id, replyDto, req.user);
    }

    @Get('my')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Kendi değerlendirmelerimi getir' })
    async getMyReviews(@Request() req: any) {
        return await this.reviewService.getUserReviews(req.user.userId);
    }

    @Put('my/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Kendi değerlendirmemi güncelle' })
    async updateMyReview(
        @Param('id') id: string,
        @Body() updateDto: UpdateReviewDto,
        @Request() req: any,
    ) {
        return await this.reviewService.updateUserReview(
            id,
            updateDto,
            req.user.userId,
        );
    }

    @Delete('my/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Kendi değerlendirmemi sil' })
    async deleteMyReview(@Param('id') id: string, @Request() req: any) {
        return await this.reviewService.deleteUserReview(id, req.user.userId);
    }

    @Get('restaurant/:id')
    @Public()
    @ApiOperation({ summary: 'Restoran yorumlarını getir (Public - Sadece Onaylılar)' })
    async getByRestaurant(@Param('id') id: string) {
        return await this.reviewService.getRestaurantReviews(id);
    }
}
