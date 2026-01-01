import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dtos';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
