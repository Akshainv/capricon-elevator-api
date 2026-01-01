// src/lead/schemas/lead.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadDocument = HydratedDocument<Lead>;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  companyName?: string;

  @Prop({
    required: true,
    enum: ['Walk-in', 'Website', 'Reference', 'Phone Call', 'Email', 'Social Media', 'Other'],
    default: 'Other',
  })
  leadSource: string;

  @Prop({
    required: true,
    enum: ['New', 'Qualified', 'Quoted', 'Won', 'Lost'],
    default: 'New',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  notes?: string;

  // NEW FIELD: Track if lead has been converted to a deal
  @Prop({ default: false })
  isConverted: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);