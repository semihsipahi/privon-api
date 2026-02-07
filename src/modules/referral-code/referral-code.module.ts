import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferralCodeService } from './referral-code.service';
import { ReferralCodeController } from './referral-code.controller';
import { ReferralCode, ReferralCodeSchema } from '../../models/referral-code.schema';
import { User, UserSchema } from '../../models/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReferralCode.name, schema: ReferralCodeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [ReferralCodeService],
  controllers: [ReferralCodeController],
  exports: [ReferralCodeService, MongooseModule],
})
export class ReferralCodeModule { }
