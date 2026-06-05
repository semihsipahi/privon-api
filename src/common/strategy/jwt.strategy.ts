import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import jwtConfig from '../config/jwt.config';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/models/user.schema';
import { Model } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../enums/user-status.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private jwtConfiguration: ConfigType<typeof jwtConfig>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfiguration.secret,
    });
  }

  async validate(payload: any) {
    const user = await this.userModel.findById(payload.sub).select('status role email restaurantId reservationBanExpiresAt');

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    if (user.status !== UserStatus.Active) {
      if (user.reservationBanExpiresAt && user.reservationBanExpiresAt < new Date()) {
        user.status = UserStatus.Active;
        user.reservationBanExpiresAt = null;
        await user.save();
      } else {
        throw new UnauthorizedException('Hesabınız aktif değil (Yasaklı veya Pasif).');
      }
    }

    return {
      userId: payload.sub,
      email: user.email,
      role: user.role,
      restaurantId: payload.restaurantId,
    };
  }
}
