import { Test, TestingModule } from '@nestjs/testing';
import { LogActivityController } from './log-activity.controller';
import { LogActivityService } from './log-activity.service';

describe('LogActivityController', () => {
  let controller: LogActivityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogActivityController],
      providers: [LogActivityService],
    }).compile();

    controller = module.get<LogActivityController>(LogActivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
