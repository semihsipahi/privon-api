import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { User } from '../../models/user.schema';
import { Restaurant } from '../../models/restaurant.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from 'src/dtos';
import { ResourceService } from 'src/services/resource.service';
import { maskName } from 'src/helpers/mask-name.util';
import { Role } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { MailService } from '../mail/mail.service';

function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export interface PrepareRestaurantOwnerResult {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  temporaryPassword: string | null;
  isNewUser: boolean;
}

@Injectable()
export class UserService extends ResourceService<
  User,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    private readonly mailService: MailService,
  ) {
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

  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -verificationCode -codeExpiresAt')
      .lean();

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    const response: any = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      imageUrl: user.imageUrl,
      isPhoneVerified: user.isPhoneVerified,
      notification: user.notification,
      status: user.status,
      ipAddress: user.ipAddress,
      transactions: user.transactions,
    };

    if (user.subscriptionExpiresAt && new Date() > new Date(user.subscriptionExpiresAt)) {
      const shouldDowngrade = [Role.TrialUser, Role.PremiumUser].includes(user.role as Role);

      if (shouldDowngrade) {
        await this.userModel.findByIdAndUpdate(user._id, { role: Role.User });

        await this.addTransaction(user._id.toString(), {
          type: 'subscription_expired',
          description: 'Abonelik süresi doldu - Standart Kullanıcıya düşürüldü',
          expired_at: user.subscriptionExpiresAt,
        });

        response.role = Role.User;
      }
    }

    // Restoran sahibi ise restoran bilgisini ekle
    if (user.role === Role.RestaurantOwner) {
      const restaurant = await this.restaurantModel
        .findOne({ owner: user._id })
        .select('_id name images')
        .lean();

      if (restaurant) {
        response.restaurant = {
          id: restaurant._id,
          name: restaurant.name,
          imageUrl: restaurant.images?.[0],
        };
      }
    }

    return response;
  }

  async addFavoriteRestaurant(userId: string, restaurantId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteRestaurants: restaurantId } },
      { new: true },
    );
  }

  async removeFavoriteRestaurant(userId: string, restaurantId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { favoriteRestaurants: restaurantId } },
      { new: true },
    );
  }

  async getFavoriteRestaurants(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'favoriteRestaurants',
        select: '_id name images categories rating reviewCount priceLevel',
        populate: {
          path: 'categories',
          select: 'name',
        },
      })
      .lean();

    if (!user || !user.favoriteRestaurants) {
      return [];
    }

    return (user.favoriteRestaurants as any[]).map((restaurant) => ({
      ...restaurant,
      categories:
        restaurant.categories
          ?.filter((c: any) => c && c.name)
          .map((c: any) => c.name) || [],
    }));
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      imageUrl?: string;
      email?: string;
      phoneNumber?: string;
      notification?: any;
    },
  ) {
    const updateData: any = {};

    if (data.fullName) {
      updateData.fullName = data.fullName;
      updateData.maskedName = maskName(data.fullName);
    }

    if (data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
    }

    if (data.email) {
      updateData.email = data.email;
    }

    if (data.phoneNumber) {
      updateData.phoneNumber = data.phoneNumber;
    }

    if (data.notification) {
      updateData.notification = data.notification;
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -verificationCode -codeExpiresAt')
      .lean();

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      imageUrl: user.imageUrl,
      isPhoneVerified: user.isPhoneVerified,
      notification: user.notification,
    };
  }

  async prepareRestaurantOwner(data: {
    fullName: string;
    email: string;
    phoneNumber: string;
  }): Promise<PrepareRestaurantOwnerResult> {
    // 1. Telefon numarasına göre mevcut kullanıcı kontrolü
    const existingPhone = await this.findByPhoneNumber(data.phoneNumber);
    if (existingPhone) {
      await this.update(existingPhone._id.toString(), {
        role: Role.RestaurantOwner,
      } as any);
      await this.sendRoleUpdateEmail(existingPhone.email, existingPhone.fullName);

      return {
        id: existingPhone._id.toString(),
        email: existingPhone.email,
        fullName: existingPhone.fullName,
        phoneNumber: existingPhone.phoneNumber,
        temporaryPassword: null,
        isNewUser: false,
      };
    }

    // 2. Email kontrolü
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictException(`Bu email adresi ile kayıtlı farklı bir kullanıcı mevcut: ${data.email}`);
    }

    // 3. Yeni kullanıcı oluştur
    const temporaryPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.create({
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: Role.RestaurantOwner,
      password: hashedPassword,
    });

    await this.sendWelcomeEmail(data.email, data.fullName, temporaryPassword);

    return {
      id: user._id.toString(),
      email: data.email,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      temporaryPassword,
      isNewUser: true,
    };
  }

  private async sendWelcomeEmail(email: string, fullName: string, password: string): Promise<void> {
    try {
      await this.mailService.sendEmail({
        to: email,
        subject: 'Restoran Hesabınız Oluşturuldu - Hoş Geldiniz!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Hoş Geldiniz, ${fullName}!</h1>
            <p>Restoran hesabınız oluşturuldu. Artık sisteme giriş yapabilirsiniz.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>E-posta:</strong> ${email}</p>
              <p><strong>Geçici Şifre:</strong> ${password}</p>
            </div>
            <p style="color: #666;">Güvenliğiniz için lütfen ilk girişinizde şifrenizi değiştirin.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Bu email otomatik olarak gönderilmiştir.</p>
          </div>
        `,
        account: 'info',
      });
    } catch (error) {
      console.error('Hoşgeldin emaili gönderilemedi:', error.message);
    }
  }

  async addTransaction(userId: string, transaction: Record<string, any>) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        $push: {
          transactions: {
            ...transaction,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    );
  }

  private async sendRoleUpdateEmail(email: string, fullName: string): Promise<void> {
    try {
      await this.mailService.sendEmail({
        to: email,
        subject: 'Restoran Hesabınız Aktifleştirildi!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Tebrikler, ${fullName}!</h1>
            <p>Hesabınız restoran sahibi olarak güncellenmiştir.</p>
            <p>Mevcut giriş bilgileriniz ile sisteme giriş yapabilirsiniz.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Bu email otomatik olarak gönderilmiştir.</p>
          </div>
        `,
        account: 'info',
      });
    } catch (error) {
      console.error('Rol güncelleme emaili gönderilemedi:', error.message);
    }
  }
}
