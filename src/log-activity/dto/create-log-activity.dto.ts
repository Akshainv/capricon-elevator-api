import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLogActivityDto {
    @IsString()
    @IsNotEmpty()
    activityType: string;
    @IsString()
    @IsNotEmpty()
    duration: string
    @IsString()
    @IsNotEmpty()
    title: string
    @IsString()
    @IsNotEmpty()
    description: string
    @IsString()
    @IsNotEmpty()
    userName: string
    @IsString()
    @IsNotEmpty()
    leadId: string
}
