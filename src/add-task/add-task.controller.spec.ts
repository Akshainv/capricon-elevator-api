import { Test, TestingModule } from '@nestjs/testing';
import { AddTaskController } from './add-task.controller';
import { AddTaskService } from './add-task.service';

describe('AddTaskController', () => {
  let controller: AddTaskController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddTaskController],
      providers: [AddTaskService],
    }).compile();

    controller = module.get<AddTaskController>(AddTaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
