import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginResponseDto,
  ResetPasswordDto,
  RegisterDto,
  VerifyPhoneDto,
  PhoneLoginDto,
  SetPasswordDto,
} from 'src/dtos';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
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
  @ApiBody({
    description: 'Telefon numarası',
    schema: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          example: '+905551234567',
          description: 'Kullanıcının telefon numarası',
        },
      },
      required: ['phoneNumber'],
    },
  })
  @Post('forgot-password')
  forgotPassword(@Body('phoneNumber') phoneNumber: string) {
    return this.authService.forgotPassword(phoneNumber);
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
}
