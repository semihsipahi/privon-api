import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from '../../models/banner.schema';
import { CreateBannerDto } from 'src/dtos/create-banner.dto';
import { UpdateBannerDto } from 'src/dtos/update-banner.dto';
import { ResourceService } from 'src/services/resource.service';

@Injectable()
export class BannerService extends ResourceService<
    Banner,
    CreateBannerDto,
    UpdateBannerDto
> {
    constructor(
        @InjectModel(Banner.name)
        private bannerModel: Model<Banner>,
    ) {
        super(bannerModel);
    }

    async getPublicBanners() {
        return await this.bannerModel
            .find({})
            .sort({ order: 1 })
            .lean();
    }
}
