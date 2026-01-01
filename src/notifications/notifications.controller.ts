// notifications.controller.ts
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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    try {
      const result = await this.notificationsService.create(createNotificationDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Notification created successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    try {
      const result = await this.notificationsService.findAll();
      return {
        statusCode: HttpStatus.OK,
        message: 'All notifications fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    try {
      const result = await this.notificationsService.findByUserId(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'User notifications fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId/unread')
  async findUnreadByUserId(@Param('userId') userId: string) {
    try {
      const result = await this.notificationsService.findUnreadByUserId(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'Unread notifications fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId/count/unread')
  async getUnreadCount(@Param('userId') userId: string) {
    try {
      const result = await this.notificationsService.getUnreadCount(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'Unread count fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId/count/read')
  async getReadCount(@Param('userId') userId: string) {
    try {
      const result = await this.notificationsService.getReadCount(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'Read count fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId/count/all')
  async getAllCount(@Param('userId') userId: string) {
    try {
      const result = await this.notificationsService.getAllCount(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'Total count fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.notificationsService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Notification fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id/mark-read')
  async markAsRead(@Param('id') id: string) {
    try {
      const result = await this.notificationsService.markAsRead(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Notification marked as read',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch('user/:userId/mark-all-read')
  async markAllAsRead(@Param('userId') userId: string) {
    try {
      const result = await this.notificationsService.markAllAsReadByUserId(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'All notifications marked as read',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    try {
      const result = await this.notificationsService.update(id, updateNotificationDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Notification updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Notification not found or update failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.notificationsService.remove(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Notification deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Notification not found or delete failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}