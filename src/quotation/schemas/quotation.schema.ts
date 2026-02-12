// schemas/quotation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuotationDocument = Quotation & Document;

class QuotationItem {
  @Prop({ type: Object })
  product: {
    name: string;
    category: string;
  };

  @Prop()
  quantity: number;

  @Prop()
  price: number;

  @Prop()
  discount: number;

  @Prop()
  tax: number;

  @Prop()
  total: number;
}

@Schema({ timestamps: true, versionKey: false })
export class Quotation {
  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerEmail: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop()
  companyName: string;

  @Prop({
    default: 'sent',
    enum: ['draft', 'sent', 'approved', 'rejected'],
  })
  status: string;

  @Prop({ required: true })
  address: string;

  @Prop({
    enum: ['home lift', 'commercial elevator', 'elevator with shaft', 'shaftless elevator', 'passenger', 'goods', 'hospital', 'service'],
    required: true,
  })
  elevationType: string;

  @Prop({ required: true })
  numberOfFloors: number;

  @Prop({ required: true, enum: ['1 door', '2 Doors', '3 Doors'] })
  doorConfiguration: string;

  @Prop({ required: true })
  numberOfElevators: number;

  @Prop({ required: true })
  speed: string;

  @Prop({ required: true })
  capacity: string;

  @Prop({
    required: true,
    enum: ['variable frequency drive', 'gearless drive', 'geared drive'],
  })
  driveType: string;

  @Prop({ required: false })
  controlSystem: string;

  @Prop({ default: false })
  includeInstallation: boolean;

  @Prop({ default: false })
  includeAMC: boolean;

  @Prop({ enum: [1, 2, 3, 4, 5], default: 1 })
  amcYears: number;

  @Prop()
  specialRequirements: string;

  @Prop()
  internalNotes: string;

  @Prop({ required: true })
  baseCost: number;

  @Prop({ default: 0 })
  installationCost: number;

  @Prop({ default: 0 })
  amcCost: number;

  @Prop()
  cgst: number;

  @Prop()
  sgst: number;

  @Prop({ required: true })
  totalCost: number;

  @Prop({ unique: true })
  quoteNumber: string;

  @Prop()
  validUntil: Date;

  // ✅ NEW: Store who created this quotation (optional for backward compatibility)
  @Prop({ required: false })
  createdBy: string;

  @Prop({ type: [QuotationItem], default: [] })
  items: QuotationItem[];

  @Prop()
  termsAndConditions: string;

  @Prop()
  notes: string;

  // ✅ NEW: Fields for PDF generation persistence
  @Prop()
  productName: string;

  @Prop({ type: Array, default: [] })
  pricingItems: any[];

  // ✅ NEW: Bank details for quotation
  @Prop({ type: Object })
  bankDetails: {
    accountNo: string;
    ifsc: string;
    bank: string;
    gstin: string;
    accountName: string;
    accountType: string;
    branch: string;
    pan: string;
  };

  // ✅ NEW: Payment terms array
  @Prop({ type: Array, default: [] })
  paymentTerms: {
    slNo: number;
    description: string;
    rate: string;
  }[];

  // ✅ NEW: GST rate
  @Prop({ default: 18 })
  gstRate: number;

  // ✅ NEW: PDF Page 4 Technical Specs
  @Prop()
  model: string;

  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: 2 })
  noOfStops: number;

  @Prop()
  elevatorType: string;

  @Prop()
  ratedLoad: string;

  @Prop()
  maximumSpeed: string;

  @Prop()
  travelHeight: string;

  @Prop()
  driveSystem: string;

  @Prop()
  cabinWalls: string;

  @Prop()
  cabinDoors: string;

  @Prop()
  doorType: string;

  @Prop()
  doorOpening: string;

  @Prop()
  copLopScreen: string;

  @Prop()
  cabinCeiling: string;

  @Prop()
  cabinFloor: string;

  @Prop({ default: 1 })
  handrails: number;
}

export const QuotationSchema = SchemaFactory.createForClass(Quotation);