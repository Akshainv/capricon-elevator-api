// notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  time: string;

  @Prop({ 
    required: true, 
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  })
  type: string;

  @Prop({ required: true, default: false })
  isRead: boolean;

  @Prop({ required: false })
  actionLink?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // User who receives this notification

  @Prop({ type: Types.ObjectId, ref: 'Lead', required: false })
  leadId?: Types.ObjectId; // Optional reference to related lead
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);