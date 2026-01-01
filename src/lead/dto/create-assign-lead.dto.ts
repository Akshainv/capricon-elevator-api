import { IsArray, IsString, ArrayNotEmpty, IsOptional } from 'class-validator';

export class CreateAssignLeadDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true }) 
  leadIds: string[];

  @IsString()
  assignedSales: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
