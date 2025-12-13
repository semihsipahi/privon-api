import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserService } from 'src/modules/user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/models/user.schema';
import { Restaurant } from 'src/models/restaurant.schema';
import { CustomException } from 'src/common/exceptions/custom.exception';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { MailService } from 'src/modules/mail/mail.service';
import {
  ChangePasswordDto,
  LoginResponseDto,
  ResetPasswordDto,
  RegisterDto,
  VerifyPhoneDto,
  PhoneLoginDto,
  SetPasswordDto,
} from 'src/dtos';
import { TemplateService } from 'src/services/template.service';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private templateService: TemplateService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<Restaurant>,
  ) { }

  async validateUser(phoneNumber: string, password: string): Promise<User> {
    const user = await this.userService.findByPhoneNumber(phoneNumber);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendSMS(phoneNumber: string, code: string): Promise<void> {
    // TODO: Gerçek SMS servisi entegrasyonu (Twilio, Netgsm, vb.)
    console.log(`SMS gönderildi: ${phoneNumber} - Kod: ${code}`);
  }

  private async generateToken(user: User): Promise<string> {
    const payload: any = { sub: user._id.toString(), role: user.role };

    if (user.role === Role.RestaurantOwner) {
      const restaurant = await this.restaurantModel.findOne({
        owner: user._id,
      }).select('_id');

      if (restaurant) {
        payload.restaurantId = restaurant._id.toString();
      }
    }

    return this.jwtService.sign(payload);
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ token: string; message: string }> {
    const { phoneNumber } = registerDto;

    const existingUser = await this.userModel.findOne({ phoneNumber });

    if (existingUser) {
      throw new CustomException('Bu telefon numarası zaten kayıtlı.', 400);
    }

    const verificationCode = this.generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    const user = new this.userModel({
      phoneNumber,
      verificationCode,
      codeExpiresAt,
      isPhoneVerified: false,
      role: Role.User,
    });

    await user.save();

    await this.sendSMS(phoneNumber, verificationCode);

    const token = await this.generateToken(user);

    return {
      token,
      message:
        'Kayıt başarılı. Telefonunuza gönderilen doğrulama kodunu giriniz.',
    };
  }

  async verifyPhone(
    userId: string,
    verifyPhoneDto: VerifyPhoneDto,
  ): Promise<{ message: string }> {
    const { verificationCode } = verifyPhoneDto;

    const user = await this.userModel.findOne({
      _id: userId,
      verificationCode,
      codeExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new CustomException(
        'Doğrulama kodu geçersiz veya süresi dolmuş.',
        400,
      );
    }

    user.isPhoneVerified = true;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    return {
      message: 'Telefon doğrulandı. Lütfen şifrenizi belirleyin.',
    };
  }

  async setPassword(
    userId: string,
    setPasswordDto: SetPasswordDto,
  ): Promise<LoginResponseDto> {
    const { password } = setPasswordDto;

    const user = await this.userModel.findOne({
      _id: userId,
      isPhoneVerified: true,
    });

    if (!user) {
      throw new CustomException(
        'Kullanıcı bulunamadı veya telefon doğrulanmamış.',
        400,
      );
    }

    if (user.password) {
      throw new CustomException('Şifre zaten belirlenmiş.', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      imageUrl: user.imageUrl,
    };
  }

  async login(phoneLoginDto: PhoneLoginDto): Promise<LoginResponseDto> {
    const { phoneNumber, password } = phoneLoginDto;

    const user = await this.validateUser(phoneNumber, password);

    if (!user) {
      throw new UnauthorizedException('Telefon numarası veya şifre hatalı');
    }

    if (!user.isPhoneVerified) {
      throw new UnauthorizedException('Telefon numaranız doğrulanmamış.');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Şifrenizi henüz belirlemediniz. Lütfen kayıt işlemini tamamlayın.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız pasife alınmıştır.');
    }

    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      imageUrl: user.imageUrl,
    };
  }

  async resendVerificationCode(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({
      _id: userId,
      isPhoneVerified: false,
    });

    if (!user) {
      throw new CustomException(
        'Kullanıcı bulunamadı veya telefon zaten doğrulanmış.',
        400,
      );
    }

    // Yeni kod oluştur
    const verificationCode = this.generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.codeExpiresAt = codeExpiresAt;
    await user.save();

    // SMS gönder
    await this.sendSMS(user.phoneNumber, verificationCode);

    return { message: 'Doğrulama kodu tekrar gönderildi.' };
  }

  async forgotPassword(phoneNumber: string) {
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new CustomException('Bu telefon numarası kayıtlı değil.', 400);
    }

    // Doğrulama kodu oluştur
    const verificationCode = this.generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    user.verificationCode = verificationCode;
    user.codeExpiresAt = codeExpiresAt;
    await user.save();

    // SMS gönder
    await this.sendSMS(phoneNumber, verificationCode);

    return { message: 'Şifre sıfırlama kodu telefonunuza gönderildi.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { phoneNumber, verificationCode, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      phoneNumber,
      verificationCode,
      codeExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new CustomException(
        'Doğrulama kodu geçersiz veya süresi dolmuş.',
        400,
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    return { message: 'Şifre başarıyla değiştirildi.' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new CustomException('Eski şifre yanlış.', 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    await user.save();

    return { message: 'Şifre başarıyla değiştirildi.' };
  }
}
