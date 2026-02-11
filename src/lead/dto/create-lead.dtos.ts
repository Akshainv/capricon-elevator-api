import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateLeadDto {
    @IsNotEmpty()
    @IsString()
    fullName: string

    @IsEmail()
    email: string

    @IsNotEmpty()
    @IsString()
    phoneNumber: string

    @IsOptional()
    @IsString()
    companyName?: string

    @IsString()
    @IsEnum(['Walk-in', 'Website', 'Reference', 'Phone Call', 'Email', 'Social Media', 'Other'])
    leadSource: string

    @IsOptional()
    @IsString()
    @IsEnum(['Seeded Lead', 'Meeting Fixed', 'Meeting Completed', 'CS Executed', 'New', 'Contacted', 'Visit Scheduled', 'Visit Completed', 'Qualified', 'Quoted', 'Won', 'Lost', 'Pending', 'Follow-Up', 'Junk', 'Junk Lead'])
    status?: string

    @IsOptional()
    @IsString()
    assignedTo?: string

    @IsOptional()
    @IsString()
    notes?: string

    @IsOptional()
    @IsString()
    address?: string

    @IsNotEmpty()
    @IsString()
    createdBy: string
}