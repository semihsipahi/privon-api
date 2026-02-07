import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/modules/user/user.module';
import { MailModule } from 'src/modules/mail/mail.module';
import { TemplateService } from 'src/services/template.service';
import jwtConfig from 'src/common/config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from 'src/common/strategy/jwt.strategy';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { ReferralCodeModule } from '../referral-code/referral-code.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    RestaurantModule,
    ReferralCodeModule,
    MailModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  providers: [AuthService, JwtStrategy, TemplateService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
