// dto/update-quotation.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateQuotationDto } from './create-quotation.dto';
import { IsEnum } from 'class-validator';

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {}

// DTO for status update only
export class UpdateQuotationStatusDto {
  @IsEnum(['draft', 'sent', 'approved', 'rejected'])
  status: string;
}