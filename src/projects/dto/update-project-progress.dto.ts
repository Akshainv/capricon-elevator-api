// src/projects/dto/update-project-progress.dto.ts
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  Min, 
  Max,
  IsEnum 
} from 'class-validator';

export class UpdateProjectProgressDto {
  @IsOptional()
  @IsEnum(['planning', 'site_preparation', 'installation', 'testing', 'handover', 'completed'])
  completedMilestone?: string; // ✅ The milestone being completed NOW (must be key format)

  @IsEnum(['planning', 'site_preparation', 'installation', 'testing', 'handover', 'completed'])
  currentMilestone: string; // ✅ The NEXT milestone to work on (must be key format)

  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @IsOptional()
  @IsString()
  progressNotes?: string;

  @IsOptional()
  @IsString()
  issuesEncountered?: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsString()
  updatedBy: string;

  @IsOptional()
  @IsEnum(['completed', 'in-progress', 'pending'])
  milestoneStatus?: string;

  @IsOptional()
  @IsString()
  milestoneTitle?: string;
}