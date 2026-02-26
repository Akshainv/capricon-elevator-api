import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectService } from './projects.service';
import { ProjectController } from './projects.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Employee, EmployeeSchema } from '../employee/schemas/employeeSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule { }