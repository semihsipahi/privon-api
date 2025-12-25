import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { RestaurantApplication, ApplicationStatus } from '../../models/restaurant-application.schema';
import { CreateApplicationDto, UpdateRestaurantApplicationDto } from '../../dtos';
import { ResourceService } from '../../services/resource.service';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { RestaurantService } from '../restaurant/restaurant.service';
import { Role } from '../../common/enums/role.enum';

function generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

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
        @InjectModel(RestaurantApplication.name) private restaurantApplicationModel: Model<RestaurantApplication>,
        private readonly userService: UserService,
        private readonly mailService: MailService,
        private readonly restaurantService: RestaurantService,
    ) {
        super(restaurantApplicationModel);
    }

    async updateStatus(id: string, status: ApplicationStatus): Promise<ApprovalResult> {
        const application = await this.restaurantApplicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Başvuru bulunamadı: ${id}`);
        }

        if (application.status === ApplicationStatus.APPROVED && status === ApplicationStatus.APPROVED) {
            throw new ConflictException('Bu başvuru zaten onaylanmış');
        }

        application.status = status;
        const updatedApplication = await application.save();

        if (status === ApplicationStatus.APPROVED) {
            const userResult = await this.createUserFromApplication(application);
            const restaurantResult = await this.createRestaurantFromApplication(application, userResult.id);
            return {
                application: updatedApplication,
                user: userResult,
                restaurant: restaurantResult,
            };
        }

        return { application: updatedApplication };
    }

    private async createUserFromApplication(application: RestaurantApplication): Promise<ApprovalResult['user']> {
        const fullName = `${application.ownerFirstName} ${application.ownerLastName}`;

        const existingPhone = await this.userService.findByPhoneNumber(application.phoneNumber);
        if (existingPhone) {
            await this.userService.update(existingPhone._id.toString(), {
                role: Role.RestaurantOwner,
            } as any);
            await this.sendRoleUpdateEmail(application.email, fullName);

            return {
                id: existingPhone._id.toString(),
                email: existingPhone.email,
                fullName: existingPhone.fullName,
                phoneNumber: existingPhone.phoneNumber,
                temporaryPassword: null,
            };
        }

        const existingEmail = await this.userService.findByEmail(application.email);
        if (existingEmail) {
            throw new ConflictException(`Bu email adresi ile kayıtlı farklı bir kullanıcı mevcut: ${application.email}`);
        }

        const temporaryPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const user = await this.userService.create({
            fullName,
            email: application.email,
            phoneNumber: application.phoneNumber,
            role: Role.RestaurantOwner,
            password: hashedPassword,
        });

        await this.sendWelcomeEmail(application.email, fullName, temporaryPassword);

        return {
            id: user._id.toString(),
            email: application.email,
            fullName,
            phoneNumber: application.phoneNumber,
            temporaryPassword,
        };
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

    private async sendWelcomeEmail(email: string, fullName: string, password: string): Promise<void> {
        try {
            await this.mailService.sendEmail({
                to: email,
                subject: 'Restoran Başvurunuz Onaylandı - Hoş Geldiniz!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333;">Hoş Geldiniz, ${fullName}!</h1>
                        <p>Restoran başvurunuz onaylandı. Artık sisteme giriş yapabilirsiniz.</p>
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

    private async sendRoleUpdateEmail(email: string, fullName: string): Promise<void> {
        try {
            await this.mailService.sendEmail({
                to: email,
                subject: 'Restoran Hesabınız Aktifleştirildi!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333;">Tebrikler, ${fullName}!</h1>
                        <p>Restoran başvurunuz onaylandı ve hesabınız restoran sahibi olarak güncellenmiştir.</p>
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
