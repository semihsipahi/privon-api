import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadModule } from './modules/upload/upload.module';
import { MailModule } from './modules/mail/mail.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { RestaurantApplicationModule } from './modules/restaurant-application/restaurant-application.module';
import { BannerModule } from './modules/banner/banner.module';
import { SlotModule } from './modules/slot/slot.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { ReviewModule } from './modules/review/review.module';
import { CategoryModule } from './modules/category/category.module';
import { SupportRequestModule } from './modules/support-request/support-request.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ReferralCodeModule } from './modules/referral-code/referral-code.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { SectionModule } from './modules/section/section.module';
import { NotificationModule } from './modules/notification/notification.module';
import { FilterOptionModule } from './modules/filter-option/filter-option.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 saniye
        limit: 100, // 60 saniyede maksimum 100 istek
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    UploadModule,
    MailModule,
    RestaurantModule,
    RestaurantApplicationModule,
    BannerModule,
    SlotModule,
    ReservationModule,
    ReviewModule,
    CategoryModule,
    SupportRequestModule,
    WebhookModule,
    ReferralCodeModule,
    WaitlistModule,
    SectionModule,
    NotificationModule,
    FilterOptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule { }
