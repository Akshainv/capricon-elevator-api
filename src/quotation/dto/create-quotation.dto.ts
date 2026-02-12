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
  @IsString()
  status?: string;

  @IsString()
  address: string;

  // ⚠️ LEGACY FIELDS - Made optional for backward compatibility
  // Frontend now uses new Page 4 fields instead (elevatorType, noOfStops, etc.)
  @IsOptional()
  @IsString()
  elevationType?: string;

  @IsOptional()
  @IsNumber()
  numberOfFloors?: number;

  @IsOptional()
  @IsString()
  doorConfiguration?: string;

  @IsOptional()
  @IsNumber()
  numberOfElevators?: number;

  @IsOptional()
  @IsString()
  speed?: string;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsString()
  driveType?: string;

  @IsOptional()
  @IsString()
  controlSystem?: string;

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

  @IsOptional()
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

  @IsOptional()
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

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsArray()
  pricingItems?: any[];

  // ✅ NEW: Bank details object
  @IsOptional()
  bankDetails?: {
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
  @IsOptional()
  @IsArray()
  paymentTerms?: {
    slNo: number;
    description: string;
    rate: string;
  }[];

  // ✅ NEW: GST rate
  @IsOptional()
  @IsNumber()
  gstRate?: number;

  // ✅ NEW: PDF Page 4 Technical Specs
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  noOfStops?: number;

  @IsOptional()
  @IsString()
  elevatorType?: string;

  @IsOptional()
  @IsString()
  ratedLoad?: string;

  @IsOptional()
  @IsString()
  maximumSpeed?: string;

  @IsOptional()
  @IsString()
  travelHeight?: string;

  @IsOptional()
  @IsString()
  driveSystem?: string;

  @IsOptional()
  @IsString()
  cabinWalls?: string;

  @IsOptional()
  @IsString()
  cabinDoors?: string;

  @IsOptional()
  @IsString()
  doorType?: string;

  @IsOptional()
  @IsString()
  doorOpening?: string;

  @IsOptional()
  @IsString()
  copLopScreen?: string;

  @IsOptional()
  @IsString()
  cabinCeiling?: string;

  @IsOptional()
  @IsString()
  cabinFloor?: string;

  @IsOptional()
  @IsNumber()
  handrails?: number;
}