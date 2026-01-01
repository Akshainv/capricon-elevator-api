import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type addTaskDocument = addTask & Document;

@Schema({ timestamps: true })
export class addTask {
  @Prop({ required: true })
  taskTitle: string;
  @Prop()
  description: string;
  @Prop({ required: true })
  dueDate: Date;
  @Prop({ required: true })
  dueTime: string;
  @Prop({ required: true, enum: ['Low', 'Medium', 'High'] })
  priority: string;
}
export const AddTaskSchema = SchemaFactory.createForClass(addTask);
