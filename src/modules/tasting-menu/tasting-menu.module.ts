import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TastingMenu,
  TastingMenuSchema,
} from '../../models/tasting-menu.schema';
import { TastingMenuController } from './tasting-menu.controller';
import { TastingMenuService } from './tasting-menu.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TastingMenu.name, schema: TastingMenuSchema },
    ]),
  ],
  controllers: [TastingMenuController],
  providers: [TastingMenuService],
  exports: [TastingMenuService],
})
export class TastingMenuModule {}
