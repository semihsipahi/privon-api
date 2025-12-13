import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RestaurantApplication, ApplicationStatus } from '../../models/restaurant-application.schema';
import { CreateApplicationDto, UpdateRestaurantApplicationDto } from '../../dtos';
import { ResourceService } from '../../services/resource.service';

@Injectable()
export class RestaurantApplicationService extends ResourceService<
    RestaurantApplication,
    CreateApplicationDto,
    UpdateRestaurantApplicationDto
> {
    constructor(
        @InjectModel(RestaurantApplication.name) private restaurantApplicationModel: Model<RestaurantApplication>,
    ) {
        super(restaurantApplicationModel);
    }

    async updateStatus(id: string, status: ApplicationStatus): Promise<RestaurantApplication> {
        const application = await this.restaurantApplicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        application.status = status;
        const updatedApplication = await application.save();

        if (status === ApplicationStatus.APPROVED) {
            // TODO: Generate password and email user
            console.log(`Application ${id} approved. User creation logic to be implemented.`);
        }

        return updatedApplication;
    }
}
