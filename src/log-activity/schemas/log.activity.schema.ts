import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,Types } from 'mongoose';

export type logActivityDocument = logActivity & Document;

@Schema({ timestamps: true })
export class logActivity {
  @Prop({ required: true, enum: ['Phone Call', 'Email', 'Meeting', 'Note'] })
  activityType: string;
  @Prop({ required: true })
  duration: string;
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  description: string;
  @Prop({ type:Types.ObjectId,ref:'deal',required: true })
  userName: Types.ObjectId; /// having confusion which user or data should be used in here is it want ref or not 
  @Prop({ type: Types.ObjectId, ref: 'Lead', required: true })
  leadId: Types.ObjectId;
}

export const LogActivitySchema = SchemaFactory.createForClass(logActivity);
