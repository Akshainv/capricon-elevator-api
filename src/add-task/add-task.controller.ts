import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AddTaskService } from './add-task.service';
import { CreateAddTaskDto } from './dto/create-add-task.dto';
import { UpdateAddTaskDto } from './dto/update-add-task.dto';

@Controller('add-task')
export class AddTaskController {
  constructor(private readonly addTaskService: AddTaskService) {}

  @Post()
  async create(@Body() createAddTaskDto: CreateAddTaskDto) {
    try {
      const result = await this.addTaskService.create(createAddTaskDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Task created successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    try {
      const result = await this.addTaskService.findAll();
      return {
        statusCode: HttpStatus.OK,
        message: 'All tasks fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.addTaskService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Task fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAddTaskDto: UpdateAddTaskDto,
  ) {
    try {
      const result = await this.addTaskService.update(id, updateAddTaskDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Task updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Task not found or update failed', HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.addTaskService.remove(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Task deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Task not found or delete failed', HttpStatus.NOT_FOUND);
    }
  }
}
