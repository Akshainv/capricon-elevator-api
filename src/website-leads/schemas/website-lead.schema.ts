import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebsiteLeadDocument = HydratedDocument<WebsiteLead>;

@Schema({ timestamps: true, collection: 'websiteleads' })
export class WebsiteLead {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    phone: string;

    @Prop()
    elevatorType?: string;

    @Prop()
    message?: string;

    @Prop({ default: 'Promotions Landing Page' })
    source: string;

    @Prop({ default: 'New', enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Junk'] })
    status: string;
}

export const WebsiteLeadSchema = SchemaFactory.createForClass(WebsiteLead);
