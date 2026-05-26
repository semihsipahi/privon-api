import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginResponseDto,
  ResetPasswordDto,
  RegisterDto,
  VerifyPhoneDto,
  PhoneLoginDto,
  SetPasswordDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ChangeUserStatusDto,
  CheckPhoneDto,
  SendLoginOtpDto,
  VerifyLoginOtpDto,
  SendPhoneUpdateOtpDto,
  VerifyPhoneUpdateDto,
} from 'src/dtos';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Public()
  @Post('check-phone')
  @ApiOperation({ summary: 'Telefon numarasını kontrol et — yeni mi, mevcut üye mi, banlı mı?' })
  checkPhone(@Body() checkPhoneDto: CheckPhoneDto) {
    return this.authService.checkPhone(checkPhoneDto.phoneNumber);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.register(registerDto, ipAddress);
  }

  @ApiBearerAuth()
  @Post('verify-phone')
  verifyPhone(@Body() verifyPhoneDto: VerifyPhoneDto, @Req() req: any) {
    return this.authService.verifyPhone(req.user.userId, verifyPhoneDto);
  }

  @ApiBearerAuth()
  @Post('set-password')
  setPassword(
    @Body() setPasswordDto: SetPasswordDto,
    @Req() req: any,
  ): Promise<LoginResponseDto> {
    return this.authService.setPassword(req.user.userId, setPasswordDto);
  }

  @Public()
  @Post('login')
  login(@Body() phoneLoginDto: PhoneLoginDto): Promise<LoginResponseDto> {
    return this.authService.login(phoneLoginDto);
  }

  @ApiBearerAuth()
  @Post('resend-code')
  resendCode(@Req() req: any) {
    return this.authService.resendVerificationCode(req.user.userId);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.phoneNumber);
  }

  @Public()
  @Post('verify-reset-code')
  verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(verifyResetCodeDto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // ─── OTP-based Login (passwordless) ─────────────────────────────────────────

  @Public()
  @Post('send-login-otp')
  @ApiOperation({ summary: 'Mevcut kullanıcıya giriş OTP kodu gönder (şifresiz giriş)' })
  sendLoginOtp(@Body() dto: SendLoginOtpDto) {
    return this.authService.sendLoginOtp(dto.phoneNumber);
  }

  @Public()
  @Post('verify-login-otp')
  @ApiOperation({ summary: 'Giriş OTP kodunu doğrula ve token al (şifresiz giriş)' })
  verifyLoginOtp(@Body() dto: VerifyLoginOtpDto) {
    return this.authService.verifyLoginOtp(dto.phoneNumber, dto.otp);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  // ─── Telefon Güncelleme (authenticated) ──────────────────────────────────────

  @ApiBearerAuth()
  @Post('send-phone-update-otp')
  @ApiOperation({ summary: 'Telefon güncelleme — yeni numaraya OTP gönder (JWT gerekli)' })
  sendPhoneUpdateOtp(@Body() dto: SendPhoneUpdateOtpDto, @Req() req: any) {
    return this.authService.sendPhoneUpdateOtp(req.user.userId, dto.phoneNumber);
  }

  @ApiBearerAuth()
  @Post('verify-phone-update')
  @ApiOperation({ summary: 'Telefon güncelleme — OTP doğrula ve numarayı kaydet (JWT gerekli)' })
  verifyPhoneUpdate(@Body() dto: VerifyPhoneUpdateDto, @Req() req: any) {
    return this.authService.verifyPhoneUpdate(req.user.userId, dto.phoneNumber, dto.otp);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @Post('admin/:id/resend-verification')
  @ApiOperation({ summary: 'Kullanıcıya doğrulama SMS\'ini tekrar gönder - Admin' })
  async adminResendVerification(@Param('id') id: string) {
    return await this.authService.adminResendVerificationCode(id);
  }

  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @Post('admin/:id/send-password-reset')
  @ApiOperation({ summary: 'Kullanıcıya şifre sıfırlama bağlantısı gönder - Admin' })
  async adminSendPasswordReset(@Param('id') id: string) {
    return await this.authService.adminSendPasswordResetLink(id);
  }
}
