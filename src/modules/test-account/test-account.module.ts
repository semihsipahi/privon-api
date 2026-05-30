import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TestAccountService } from './test-account.service';

@Module({
  imports: [ConfigModule],
  providers: [TestAccountService],
  exports: [TestAccountService],
})
export class TestAccountModule {}
