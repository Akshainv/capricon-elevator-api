import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/module/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordModule } from './auth/module/password.module';
import { LeadModule } from './lead/lead.module';
import { QuotationModule } from './quotation/quotation.module';
import { DealModule } from './deal/deal.module';
import { LogActivityModule } from './log-activity/log-activity.module';
import { AddTaskModule } from './add-task/add-task.module';
import { EmployeeModule } from './employee/employee.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProjectModule } from './projects/projects.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module'; // ← ADD THIS LINE
import { PerformanceModule } from './performance/performance.module';
import { ProfileSettingsModule } from './profile-settings/profile-settings.module';

import config from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '1h' },
      }),
      global: true,
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.connectionString'),
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    PasswordModule,
    LeadModule,
    QuotationModule,
    DealModule,
    LogActivityModule,
    AddTaskModule,
    EmployeeModule,
    NotificationsModule,
    ProjectModule,
    DashboardModule,
    ReportsModule,
    PerformanceModule,
    ProfileSettingsModule, // ← ADD THIS LINE
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }