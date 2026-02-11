import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Lead } from './lead.schema';
import { Document, Types } from 'mongoose';

export type assignLeadDocument = assignLead & Document;

@Schema()
export class assignLead {
  @Prop({
    type: [{ type: Types.ObjectId, ref: Lead.name }],
    required: true,
  })
  leadIds: Types.ObjectId[];

  @Prop({ required: true })
  assignedSales: string;

  @Prop({ default: 0 })
  leadCount: number;

  @Prop()
  notes: string;
}

export const AssignLeadSchema = SchemaFactory.createForClass(assignLead);
