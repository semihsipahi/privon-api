import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

import { ConfigModule } from '@nestjs/config';
import mailConfig from 'src/common/config/mail.config';

@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService],
  exports: [MailService],
  controllers: [MailController],
})
export class MailModule {}
