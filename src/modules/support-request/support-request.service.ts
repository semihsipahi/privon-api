import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportRequest } from '../../models/support-request.schema';
import { CreateSupportRequestDto } from 'src/dtos/create-support-request.dto';
import { ResourceService } from 'src/services/resource.service';

@Injectable()
export class SupportRequestService extends ResourceService<
    SupportRequest,
    CreateSupportRequestDto,
    Partial<CreateSupportRequestDto>
> {
    constructor(
        @InjectModel(SupportRequest.name)
        private supportRequestModel: Model<SupportRequest>,
    ) {
        super(supportRequestModel);
    }

    async createRequest(
        dto: CreateSupportRequestDto,
        userId?: string,
        userEmail?: string,
        userPhone?: string,
    ): Promise<SupportRequest> {
        const data: any = {
            title: dto.title,
            message: dto.message,
            email: dto.email || userEmail,
            phoneNumber: dto.phoneNumber || userPhone,
        };

        if (userId) {
            data.user = userId;
        }

        return await this.supportRequestModel.create(data);
    }
}
