import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { LogActivityService } from './log-activity.service';
import { CreateLogActivityDto } from './dto/create-log-activity.dto';
import { UpdateLogActivityDto } from './dto/update-log-activity.dto';

@Controller('log-activity')
export class LogActivityController {
  constructor(private readonly logActivityService: LogActivityService) {}

  @Post()
  async create(@Body() createLogActivityDto: CreateLogActivityDto) {
    try {
      const result = await this.logActivityService.create(createLogActivityDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'log-activity created successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    try {
      const result = await this.logActivityService.findAll();
      return {
        statusCode: HttpStatus.OK,
        message: 'All log-activities fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.logActivityService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'log-activity fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('log-activity not found', HttpStatus.NOT_FOUND);
    }
  }
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLogActivityDto: UpdateLogActivityDto,
  ) {
    try {
      const result = await this.logActivityService.update(
        id,
        updateLogActivityDto,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'log-activity updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'log-activity not found or update failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try{
      const result = await this.logActivityService.remove(id);
     return {
        statusCode: HttpStatus.OK,
        message: 'log-activity deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('log-activity not found or delete failed', HttpStatus.NOT_FOUND);
    }
  }
}
