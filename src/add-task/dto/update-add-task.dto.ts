import { PartialType } from '@nestjs/mapped-types';
import { CreateAddTaskDto } from './create-add-task.dto';

export class UpdateAddTaskDto extends PartialType(CreateAddTaskDto) {}
