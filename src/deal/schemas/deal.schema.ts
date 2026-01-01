// src/deal/schemas/deal.schema.ts - Updated with proper indexing
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type dealDocument = deal & Document;

@Schema({ timestamps: true })
export class deal {
  @Prop({ required: true })
  dealTitle: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  contactPerson: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({
    required: true,
    enum: [
      'Website',
      'Walk-in',
      'Reference',
      'Phone Call',
      'Email',
      'Social Media',
      'quotation',
    ],
  })
  leadSource: string;

  @Prop({
    required: true,
    enum: [
      'Passenger Elevator',
      'Goods Elevator',
      'Home Lift',
      'Hospital Elevator',
      'Commercial Elevator',
    ],
  })
  dealDetails: string;

  @Prop({ required: true })
  NumberOFloors: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  dealAmount: number;

  @Prop({
    required: true,
    enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'pending'],
    default: 'lead',
    index: true // ✅ Add index for faster queries
  })
  DealStatus: string;

  @Prop({ required: true, min: 0, max: 100 })
  Probability: number;

  @Prop({ required: true })
  expectedClosingDate: Date;

  @Prop({ required: true, index: true }) // ✅ Add index for assignedTo queries
  assignedTo: string;

  @Prop()
  address: string;

  @Prop()
  requirementNotes: string;

  @Prop()
  internalNotes: string;

  // Conversion tracking
  @Prop({ default: false, index: true }) // ✅ Add index for converted queries
  converted: boolean;

  @Prop({ type: String, ref: 'Project' })
  convertedProjectId: string;

  @Prop()
  convertedDate: Date;

  @Prop()
  convertedBy: string;

  // Sales executive tracking
  @Prop({ required: true, index: true }) // ✅ Add index for createdBy queries
  createdBy: string;

  @Prop()
  lastUpdatedBy: string;

  // Quotation tracking fields
  @Prop()
  quoteNumber: string;

  @Prop({ type: String, ref: 'Quotation' })
  quotationId: string;

  @Prop()
  createdFrom: string;
}

export const DealSchema = SchemaFactory.createForClass(deal);

// ✅ Add compound indexes for common queries
DealSchema.index({ DealStatus: 1, converted: 1 });
DealSchema.index({ assignedTo: 1, DealStatus: 1 });
DealSchema.index({ assignedTo: 1, converted: 1 });