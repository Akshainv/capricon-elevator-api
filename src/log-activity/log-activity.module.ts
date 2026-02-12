import { Module } from '@nestjs/common';
import { LogActivityService } from './log-activity.service';
import { LogActivityController } from './log-activity.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { logActivity, LogActivitySchema } from './schemas/log.activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: logActivity.name, schema: LogActivitySchema },
    ]),
  ],
  controllers: [LogActivityController],
  providers: [LogActivityService],
})
export class LogActivityModule {}
