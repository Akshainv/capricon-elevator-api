import { PartialType } from '@nestjs/mapped-types';
import { CreateLogActivityDto } from './create-log-activity.dto';

export class UpdateLogActivityDto extends PartialType(CreateLogActivityDto) {}
