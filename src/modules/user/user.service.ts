import { Injectable } from '@nestjs/common';
import { User } from '../../models/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from 'src/dtos';
import { ResourceService } from 'src/services/resource.service';
import { maskName } from 'src/helpers/mask-name.util';

@Injectable()
export class UserService extends ResourceService<
  User,
  CreateUserDto,
  CreateUserDto
> {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel);
  }

  async create(data: CreateUserDto, session?: any) {
    const maskedName = maskName(data.fullName);
    const userData = {
      ...data,
      maskedName,
    };
    return super.create(userData as any, session);
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }
}
