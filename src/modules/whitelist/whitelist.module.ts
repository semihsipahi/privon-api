import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Whitelist, WhitelistSchema } from './whitelist.schema';
import { WhitelistService } from './whitelist.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Whitelist.name, schema: WhitelistSchema },
    ]),
  ],
  providers: [WhitelistService],
  exports: [WhitelistService],
})
export class WhitelistModule {}
