import { Module } from '@nestjs/common';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Lead, LeadSchema } from '../lead/schemas/lead.schema';

@Module({
    imports: [
        HttpModule,
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Lead.name, schema: LeadSchema },
        ]),
    ],
    controllers: [FacebookController],
    providers: [FacebookService],
})
export class FacebookModule { }
