// src/profile-settings/profile-settings.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileSettingsController } from './profile-settings.controller';
import { ProfileSettingsService } from './profile-settings.service';
import { Employee, EmployeeSchema } from '../employee/schemas/employeeSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [ProfileSettingsController],
  providers: [ProfileSettingsService],
  exports: [ProfileSettingsService],
})
export class ProfileSettingsModule {}