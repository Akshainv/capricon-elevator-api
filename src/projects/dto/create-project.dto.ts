// src/dto/create-project.dto.ts
import { 
  IsString, 
  IsEmail, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  IsDateString,
  IsArray,
  Min,
  Max
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  projectName: string;

  @IsString()
  projectCode: string;

  @IsString()
  clientName: string;

  @IsString()
  contactPerson: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  contactPhone: string;

  @IsString()
  siteAddress: string;

  @IsEnum([
    'Passenger Elevator',
    'Goods Elevator',
    'Home Lift',
    'Hospital Elevator',
    'Commercial Elevator',
  ])
  elevatorType: string;

  @IsOptional()
  @IsNumber()
  numberOfFloors?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsNumber()
  projectValue: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  expectedCompletionDate: string;

  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

  @IsOptional()
  @IsEnum(['not_started', 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])
  projectStatus?: string;

  @IsOptional()
  @IsEnum(['planning', 'site_preparation', 'installation', 'testing', 'handover', 'completed'])
  currentMilestone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @IsString()
  assignedTo: string;

  @IsString()
  projectManager: string;

  @IsOptional()
  @IsString()
  projectDescription?: string;

  @IsOptional()
  @IsString()
  technicalSpecifications?: string;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamMembers?: string[];

  @IsString()
  dealId: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceDealId?: string;

  @IsOptional()
  @IsString()
  createdFrom?: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  amountPending?: number;
}