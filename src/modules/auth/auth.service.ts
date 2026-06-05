import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from 'src/modules/user/user.service';
import { ReferralCodeService } from 'src/modules/referral-code/referral-code.service';
import { WaitlistService } from 'src/modules/waitlist/waitlist.service';
import { WhitelistService } from 'src/modules/whitelist/whitelist.service';
import { TestAccountService } from 'src/modules/test-account/test-account.service';
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
  VerifyResetCodeDto,
} from 'src/dtos';
import { TemplateService } from 'src/services/template.service';
import { Role } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { normalizePhone } from 'src/helpers/phone.helper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly referralCodeService: ReferralCodeService,
    private readonly waitlistService: WaitlistService,
    private readonly whitelistService: WhitelistService,
    private readonly testAccountService: TestAccountService,
    private templateService: TemplateService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<Restaurant>,
  ) { }

  async checkPhone(
    phoneNumber: string,
  ): Promise<{
    status: 'new' | 'existing' | 'invited' | 'waitlist' | 'banned' | 'not_allowed';
    accessToken?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    birthDate?: string;
    reservationBanExpiresAt?: string | null;
  }> {
    phoneNumber = normalizePhone(phoneNumber);
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      // Waitlist kontrolü — bekleme listesindeki kullanıcı (invite code ile kayıt olabilir)
      const waitlistEntry = await this.waitlistService.findByPhone(phoneNumber);
      if (waitlistEntry) {
        return {
          status: 'waitlist',
          firstName: waitlistEntry.firstName,
          lastName: waitlistEntry.lastName,
          email: waitlistEntry.email,
          birthDate: waitlistEntry.birthDate,
        };
      }

      // Whitelist kontrolü — doğrudan erişim yetkisi verilmiş numara (invite code ile kayıt olabilir)
      const whitelistEntry = await this.whitelistService.findByPhone(phoneNumber);
      if (whitelistEntry) {
        return { status: 'new' };
      }

      // Ne waitlist'te ne whitelist'te — erişim izni yok
      return { status: 'not_allowed' };
    }

    await this.userService.autoRestoreIfExpired(user);
    if (user.status === UserStatus.Banned) {
      return { status: 'banned', reservationBanExpiresAt: user.reservationBanExpiresAt?.toISOString() ?? null };
    }

    // Admin tarafından oluşturulan ve henüz şifresi olmayan kullanıcı — ilk kurulum akışı
    if (!user.password) {
      return {
        status: 'invited',
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      };
    }

    return { status: 'existing' };
  }

  async validateUser(phoneNumber: string, password: string): Promise<User> {
    const user = await this.userService.findByPhoneNumber(phoneNumber);

    if (!user) {
      throw new CustomException('Kullanıcı bulunamadı.', 400);
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  private generateVerificationCode(normalizedPhone?: string): string {
    if (normalizedPhone && this.testAccountService.isTestPhone(normalizedPhone)) {
      return this.testAccountService.getTestOtp();
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendSMS(phoneNumber: string, code: string): Promise<void> {
    if (this.testAccountService.isTestPhone(phoneNumber)) {
      this.logger.log(`[TEST_ACCOUNT] SMS skipped for ${phoneNumber} — OTP: ${code}`);
      return;
    }

    const url = 'https://api.toplusms.app/api/v1/otp';
    const body = {
      api_key: process.env.SMS_API_KEY,
      sender: process.env.SMS_HEADER || 'YEMAP TEKN',
      message_type: 'normal',
      message: `Dogrulama Kodunuz: ${code}`,
      phones: [phoneNumber],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || (data.status && data.status !== 'success')) {
        this.logger.error(`SMS Error: ${JSON.stringify(data)}`);
      } else {
        this.logger.log(`SMS sent successfully to ${phoneNumber}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
    }
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

  private async buildLoginResponse(user: User, accessToken: string): Promise<LoginResponseDto> {
    const response: LoginResponseDto = {
      accessToken,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      imageUrl: user.imageUrl,
    };

    if (user.role === Role.RestaurantOwner) {
      const restaurant = await this.restaurantModel
        .findOne({ owner: user._id })
        .select('_id name images');

      if (restaurant) {
        response.restaurant = {
          id: restaurant._id.toString(),
          name: restaurant.name,
          imageUrl: restaurant.images?.[0],
        };
      }
    }

    return response;
  }

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
  ): Promise<{ accessToken: string; message: string }> {
    const {
      inviteCode,
      firstName,
      lastName,
      email,
      birthDate,
      acceptedMarketing,
    } = registerDto;
    const phoneNumber = normalizePhone(registerDto.phoneNumber);

    const existingUser = await this.userModel.findOne({ phoneNumber });
    if (existingUser) {
      throw new CustomException('Bu telefon numarası zaten kayıtlı.', 400);
    }

    const { referralCode: codeDoc, referrerUserId } =
      await this.referralCodeService.validateCode(inviteCode);

    const isBetaMode = this.configService.get<string>('BETA_MODE') === 'true';

    const user = new this.userModel({
      phoneNumber,
      firstName,
      lastName,
      email,
      birthDate,
      acceptedMarketing: acceptedMarketing ?? false,
      isPhoneVerified: false,
      role: Role.TrialUser,
      subscriptionExpiresAt: isBetaMode
        ? null
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      ipAddress,
      registeredWithCode: codeDoc._id,
      referredBy: referrerUserId || undefined,
      transactions: [
        {
          type: 'registration',
          description: isBetaMode
            ? 'Kullanıcı kaydı oluşturuldu - Beta Dönemi'
            : 'Kullanıcı kaydı oluşturuldu - Deneme Süresi Başladı',
          referralCode: inviteCode,
          createdAt: new Date(),
          ip: ipAddress,
        },
      ],
    });

    const verificationCode = this.generateVerificationCode(phoneNumber);
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.verificationCode = verificationCode;
    user.codeExpiresAt = codeExpiresAt;

    await user.save();

    await this.referralCodeService.markCodeUsed(
      codeDoc._id.toString(),
      user._id.toString(),
    );

    // SMS burada gönderilmiyor — kullanıcı "KOD GÖNDER" butonuna basınca resend-code endpoint'i tetikler
    const accessToken = await this.generateToken(user);

    return { accessToken, message: 'Kayıt başarılı.' };
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
    return this.buildLoginResponse(user, accessToken);
  }

  async login(phoneLoginDto: PhoneLoginDto): Promise<LoginResponseDto> {
    const { password } = phoneLoginDto;
    const phoneNumber = normalizePhone(phoneLoginDto.phoneNumber);

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

    await this.userService.autoRestoreIfExpired(user);
    if (user.status !== UserStatus.Active) {
      throw new UnauthorizedException('Hesabınız aktif değil (Yasaklı veya Pasif).');
    }

    const accessToken = await this.generateToken(user);
    return this.buildLoginResponse(user, accessToken);
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
    const verificationCode = this.generateVerificationCode(user.phoneNumber);
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.codeExpiresAt = codeExpiresAt;
    await user.save();

    // SMS gönder
    await this.sendSMS(user.phoneNumber, verificationCode);

    return { message: 'Doğrulama kodu tekrar gönderildi.' };
  }

  async forgotPassword(phoneNumber: string) {
    phoneNumber = normalizePhone(phoneNumber);
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new CustomException('Bu telefon numarası kayıtlı değil.', 400);
    }

    // Doğrulama kodu oluştur
    const verificationCode = this.generateVerificationCode(phoneNumber);
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    user.verificationCode = verificationCode;
    user.codeExpiresAt = codeExpiresAt;
    await user.save();

    // SMS gönder
    await this.sendSMS(phoneNumber, verificationCode);

    return { message: 'Şifre sıfırlama kodu telefonunuza gönderildi.' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    const { verificationCode } = verifyResetCodeDto;
    const phoneNumber = normalizePhone(verifyResetCodeDto.phoneNumber);

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

    // Reset token oluştur (30 dakika geçerli)
    const resetToken = this.jwtService.sign(
      { sub: user._id, purpose: 'password_reset' },
      { expiresIn: '30m' },
    );

    return {
      message: 'Kod doğrulandı.',
      resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;

    let userId: string;

    try {
      // Önce JWT olarak dene (SMS flow)
      const payload = this.jwtService.verify(resetToken);
      if (payload.purpose !== 'password_reset') {
        throw new Error('Invalid purpose');
      }
      userId = payload.sub;
    } catch (error) {
      // JWT değilse veya geçersizse, veritabanında ara (Admin link flow)
      const userWithToken = await this.userModel.findOne({
        verificationCode: resetToken,
        codeExpiresAt: { $gt: new Date() },
      });

      if (!userWithToken) {
        throw new CustomException('Geçersiz veya süresi dolmuş token.', 400);
      }
      userId = userWithToken._id.toString();
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new CustomException('Kullanıcı bulunamadı.', 400);
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

  // ─── OTP-based Login (passwordless) ─────────────────────────────────────────

  async sendLoginOtp(phoneNumber: string): Promise<{ message: string }> {
    const normalizedPhone = normalizePhone(phoneNumber);
    const user = await this.userModel.findOne({ phoneNumber: normalizedPhone });
    if (!user) {
      throw new CustomException('Bu telefon numarasıyla kayıtlı bir hesap bulunamadı.', 400);
    }
    await this.userService.autoRestoreIfExpired(user);
    if (user.status === UserStatus.Banned) {
      throw new CustomException('Hesabınız askıya alınmıştır. Destek ile iletişime geçin.', 403);
    }
    const code = this.generateVerificationCode(normalizedPhone);
    user.verificationCode = code;
    user.codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await this.sendSMS(normalizedPhone, code);
    return { message: 'Doğrulama kodu gönderildi.' };
  }

  async verifyLoginOtp(phoneNumber: string, otp: string): Promise<LoginResponseDto> {
    const normalizedPhone = normalizePhone(phoneNumber);
    const user = await this.userModel.findOne({
      phoneNumber: normalizedPhone,
      verificationCode: otp,
      codeExpiresAt: { $gt: new Date() },
    });
    if (!user) {
      throw new CustomException('Doğrulama kodu hatalı veya süresi dolmuş.', 400);
    }
    user.verificationCode = undefined;
    user.codeExpiresAt = undefined;
    await user.save();
    const accessToken = await this.generateToken(user);
    return this.buildLoginResponse(user, accessToken);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async adminResendVerificationCode(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomException('Kullanıcı bulunamadı', 400);

    const verificationCode = this.generateVerificationCode(user.phoneNumber);
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.codeExpiresAt = codeExpiresAt;
    await user.save();

    await this.sendSMS(user.phoneNumber, verificationCode);
    return { message: 'Doğrulama kodu SMS ile gönderildi.' };
  }

  async adminSendPasswordResetLink(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomException('Kullanıcı bulunamadı', 400);

    if (!user.email) throw new CustomException('Kullanıcı e-posta adresi yok', 400);

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    user.verificationCode = resetToken;
    user.codeExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
    await user.save();

    const resetLink = `https://www.yerinde.com/reset-password?token=${resetToken}&phone=${user.phoneNumber}`;

    await this.mailService.sendEmail({
      to: user.email,
      subject: 'Şifre Sıfırlama Bağlantısı',
      html: `
            <h3>Şifre Sıfırlama</h3>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>Bu bağlantı 1 saat geçerlidir.</p>
        `,
      account: 'info',
    });

    return { message: 'Şifre sıfırlama bağlantısı e-posta ile gönderildi.' };
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    return this.userModel.findByIdAndUpdate(userId, { status }, { new: true });
  }

  // ─── Telefon Güncelleme (authenticated, 2-adım) ───────────────────────────────

  async sendPhoneUpdateOtp(userId: string, newPhone: string): Promise<{ message: string }> {
    const normalizedNew = normalizePhone(newPhone);

    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomException('Kullanıcı bulunamadı.', 404);
    if (user.status === UserStatus.Banned) throw new CustomException('Hesabınız askıya alınmıştır.', 403);
    if (user.phoneNumber === normalizedNew) throw new CustomException('Yeni numara mevcut numaranızla aynı.', 400);

    const conflict = await this.userModel.findOne({ phoneNumber: normalizedNew, _id: { $ne: userId } });
    if (conflict) throw new CustomException('Bu telefon numarası başka bir hesaba kayıtlı.', 409);

    const code = this.generateVerificationCode(normalizedNew);
    user.verificationCode = code;
    user.codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // OTP yeni numaraya gönderilir — kullanıcı yeni numarasına erişimi kanıtlar
    await this.sendSMS(normalizedNew, code);
    return { message: 'Doğrulama kodu yeni telefon numaranıza gönderildi.' };
  }

  async verifyPhoneUpdate(userId: string, newPhone: string, otp: string): Promise<{ message: string }> {
    const normalizedNew = normalizePhone(newPhone);

    const user = await this.userModel.findOne({
      _id: userId,
      verificationCode: otp,
      codeExpiresAt: { $gt: new Date() },
    });

    if (!user) throw new CustomException('Doğrulama kodu hatalı veya süresi dolmuş.', 400);

    // send → verify arası başkası aynı numarayı almış olabilir
    const conflict = await this.userModel.findOne({ phoneNumber: normalizedNew, _id: { $ne: userId } });
    if (conflict) throw new CustomException('Bu telefon numarası başka bir hesaba kayıtlı.', 409);

    user.phoneNumber = normalizedNew;
    user.verificationCode = undefined;
    user.codeExpiresAt = undefined;
    await user.save();

    return { message: 'Telefon numaranız başarıyla güncellendi.' };
  }

  async acceptLegal(
    userId: string,
    acceptedTerms: boolean,
    acceptedPrivacy: boolean,
    acceptedMarketing?: boolean,
  ) {
    if (!acceptedTerms || !acceptedPrivacy) {
      throw new CustomException('Kullanım Şartları ve Aydınlatma Metni onayı zorunludur.', 400);
    }
    const now = new Date();
    await this.userModel.findByIdAndUpdate(userId, {
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
      ...(acceptedMarketing !== undefined && { acceptedMarketing }),
    });
    return { message: 'Belgeler başarıyla onaylandı.' };
  }
}
