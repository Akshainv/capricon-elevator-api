import { Test, TestingModule } from '@nestjs/testing';
import { AddTaskService } from './add-task.service';

describe('AddTaskService', () => {
  let service: AddTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AddTaskService],
    }).compile();

    service = module.get<AddTaskService>(AddTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
