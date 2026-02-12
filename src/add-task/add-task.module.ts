import { Module } from '@nestjs/common';
import { AddTaskService } from './add-task.service';
import { AddTaskController } from './add-task.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { addTask, AddTaskSchema } from './schemas/add-task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: addTask.name, schema: AddTaskSchema }]),
  ],
  controllers: [AddTaskController],
  providers: [AddTaskService],
})
export class AddTaskModule {}
