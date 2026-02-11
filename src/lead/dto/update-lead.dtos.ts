// src/lead/dto/update-lead.dtos.ts (Backend) - COMPLETE FIXED VERSION
import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEnum(['Walk-in', 'Website', 'Reference', 'Phone Call', 'Email', 'Social Media', 'Other'])
  leadSource?: string;

  // ✅ COMPLETE STATUS ENUM: Matches schema exactly
  @IsOptional()
  @IsEnum([
    'Seeded Lead',
    'Meeting Fixed',
    'Meeting Completed',
    'CS Executed',
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
  ])
  status?: string;

  @IsOptional()
  assignedTo?: Types.ObjectId | string;

  @IsOptional()
  createdBy?: Types.ObjectId | string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isConverted?: boolean;
}