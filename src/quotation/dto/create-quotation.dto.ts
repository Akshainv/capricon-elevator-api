// dto/create-quotation.dto.ts
import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuotationItemDto {
  @IsOptional()
  product?: {
    name: string;
    category: string;
  };

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsNumber()
  total?: number;
}

export class CreateQuotationDto {
  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'approved', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(['home lift', 'commercial elevator', 'elevator with shaft', 'shaftless elevator', 'passenger', 'goods', 'hospital', 'service'])
  elevationType: string;

  @IsNumber()
  numberOfFloors: number;

  @IsEnum(['1 door', '2 Doors', '3 Doors'])
  doorConfiguration: string;

  @IsNumber()
  numberOfElevators: number;

  @IsEnum(['1.0 m/s', '1.5 m/s', '2.0 m/s', '2.5 m/s'])
  speed: string;

  @IsEnum(['8', '10', '13', '16'])
  capacity: string;

  @IsEnum(['variable frequency drive', 'gearless drive', 'geared drive'])
  driveType: string;

  @IsEnum(['microprocessor based', 'plc based', 'iot based'])
  controlSystem: string;

  @IsOptional()
  @IsBoolean()
  includeInstallation?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAMC?: boolean;

  @IsOptional()
  @IsNumber()
  amcYears?: number;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsNumber()
  baseCost: number;

  @IsOptional()
  @IsNumber()
  installationCost?: number;

  @IsOptional()
  @IsNumber()
  amcCost?: number;

  @IsOptional()
  @IsNumber()
  cgst?: number;

  @IsOptional()
  @IsNumber()
  sgst?: number;

  @IsNumber()
  totalCost: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}