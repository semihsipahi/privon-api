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

  @ApiBearerAuth()
  @Post('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

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
