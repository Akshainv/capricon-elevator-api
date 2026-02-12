import { IsString, IsEmail, IsNotEmpty, IsEnum, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateDealDto {
  @IsString()
  @IsNotEmpty()
  dealTitle: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEnum(['Website', 'Walk-in', 'Reference', 'Phone Call', 'Email', 'Social Media'])
  @IsNotEmpty()
  leadSource: string;

  @IsEnum([
    'Passenger Elevator',
    'Goods Elevator',
    'Home Lift',
    'Hospital Elevator',
    'Commercial Elevator',
  ])
  @IsNotEmpty()
  dealDetails: string;

  @IsNumber()
  @IsNotEmpty()
  NumberOFloors: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  dealAmount: number;

  @IsEnum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
  @IsOptional()
  DealStatus?: string;

  @IsNumber()
  @IsOptional()
  Probability?: number;

  @IsDateString()
  @IsNotEmpty()
  expectedClosingDate: Date;

  @IsString()
  @IsNotEmpty()
  assignedTo: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  requirementNotes?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}