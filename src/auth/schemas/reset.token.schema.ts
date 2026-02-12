// src/auth/schemas/reset-password.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordResetDocument = PasswordReset & Document;

@Schema({ timestamps: true, versionKey: false })
export class PasswordReset {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  expiryDate: Date;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
