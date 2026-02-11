// src/lead/schemas/lead.schema.ts (Backend) - COMPLETE FIXED VERSION
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
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  priority: string;

  @Prop({
    required: true,
    enum: ['Walk-in', 'Website', 'Reference', 'Phone Call', 'Email', 'Social Media', 'Other'],
    default: 'Other',
  })
  leadSource: string;

  // ✅ COMPLETE STATUS ENUM: Includes ALL status values (existing + new)
  @Prop({
    required: true,
    enum: [
      // New standardized statuses
      'Seeded Lead',
      'CS Executive Assigned',
      'Meeting Fixed',
      'Meeting Completed',
      'CS Executed',
      // Legacy statuses (for backward compatibility with existing data)
      'New',
      'Contacted',
      'Visit Scheduled',
      'Visit Completed',
      'Qualified',
      'Quoted',
      'Won',
      'Lost',
      'Pending',
      'Follow-Up',
      'Junk',
      'Junk Lead'
    ],
    default: 'Seeded Lead',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop()
  address?: string;

  @Prop({ default: false })
  isConverted: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);