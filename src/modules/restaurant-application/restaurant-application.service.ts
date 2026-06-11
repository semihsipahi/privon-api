import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RestaurantApplication,
  ApplicationStatus,
} from '../../models/restaurant-application.schema';
import {
  CreateApplicationDto,
  UpdateRestaurantApplicationDto,
} from '../../dtos';
import { ResourceService } from '../../services/resource.service';
import {
  UserService,
  PrepareRestaurantOwnerResult,
} from '../user/user.service';
import { RestaurantService } from '../restaurant/restaurant.service';

export interface ApprovalResult {
  application: RestaurantApplication;
  user?: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    temporaryPassword: string | null;
  };
  restaurant?: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

@Injectable()
export class RestaurantApplicationService extends ResourceService<
  RestaurantApplication,
  CreateApplicationDto,
  UpdateRestaurantApplicationDto
> {
  constructor(
    @InjectModel(RestaurantApplication.name)
    private restaurantApplicationModel: Model<RestaurantApplication>,
    private readonly userService: UserService,
    private readonly restaurantService: RestaurantService,
  ) {
    super(restaurantApplicationModel);
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<ApprovalResult> {
    const application = await this.restaurantApplicationModel
      .findById(id)
      .exec();
    if (!application) {
      throw new NotFoundException(`Başvuru bulunamadı: ${id}`);
    }

    if (
      application.status === ApplicationStatus.APPROVED &&
      status === ApplicationStatus.APPROVED
    ) {
      throw new ConflictException('Bu başvuru zaten onaylanmış');
    }

    application.status = status;
    const updatedApplication = await application.save();

    if (status === ApplicationStatus.APPROVED) {
      const fullName = `${application.ownerFirstName} ${application.ownerLastName}`;
      const userResult = await this.userService.prepareRestaurantOwner({
        fullName,
        email: application.email,
        phoneNumber: application.phoneNumber,
      });
      const restaurantResult = await this.createRestaurantFromApplication(
        application,
        userResult.id,
      );
      return {
        application: updatedApplication,
        user: {
          id: userResult.id,
          email: userResult.email,
          fullName: userResult.fullName,
          phoneNumber: userResult.phoneNumber,
          temporaryPassword: userResult.temporaryPassword,
        },
        restaurant: restaurantResult,
      };
    }

    return { application: updatedApplication };
  }

  private async createRestaurantFromApplication(
    application: RestaurantApplication,
    ownerId: string,
  ): Promise<ApprovalResult['restaurant']> {
    const restaurant = await this.restaurantService.create({
      owner: ownerId,
      name: application.businessName,
      phone: application.phoneNumber,
      email: application.email,
      isActive: false,
    } as any);

    return {
      id: restaurant._id.toString(),
      name: restaurant.name,
      isActive: restaurant.isActive,
    };
  }
}
