import { IsNotEmpty, IsString } from "class-validator";

export class CreateAddTaskDto {
    @IsString()
    @IsNotEmpty()
    taskTitle: string;
    @IsString()
    description: string;
    @IsString()
    @IsNotEmpty()
    dueDate: Date
    @IsString()
    @IsNotEmpty()
    dueTime: string
    @IsString()
    @IsNotEmpty()
    priority: string

}
