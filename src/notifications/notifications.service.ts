// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) 
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const createNotification = new this.notificationModel(createNotificationDto);
    const savedNotification = await createNotification.save();
    return savedNotification;
  }

  async findAll() {
    const notifications = await this.notificationModel
      .find()
      .populate('userId', 'name email')
      .populate('leadId', 'name company')
      .sort({ createdAt: -1 })
      .exec();
    return notifications;
  }

  async findByUserId(userId: string) {
    const notifications = await this.notificationModel
      .find({ userId })
      .populate('leadId', 'name company')
      .sort({ createdAt: -1 })
      .exec();
    return notifications;
  }

  async findUnreadByUserId(userId: string) {
    const notifications = await this.notificationModel
      .find({ userId, isRead: false })
      .populate('leadId', 'name company')
      .sort({ createdAt: -1 })
      .exec();
    return notifications;
  }

  async findOne(id: string) {
    const notification = await this.notificationModel
      .findById(id)
      .populate('userId', 'name email')
      .populate('leadId', 'name company')
      .exec();
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    const updatedNotification = await this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .exec();
    if (!updatedNotification) {
      throw new Error('Notification not found or could not be updated');
    }
    return updatedNotification;
  }

  async markAsRead(id: string) {
    const notification = await this.notificationModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .exec();
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async markAllAsReadByUserId(userId: string) {
    const result = await this.notificationModel
      .updateMany({ userId, isRead: false }, { isRead: true })
      .exec();
    return {
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    };
  }

  async remove(id: string) {
    const deletedNotification = await this.notificationModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedNotification) {
      throw new Error('Notification not found or could not be deleted');
    }
    return { message: 'Notification successfully deleted' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationModel
      .countDocuments({ userId, isRead: false })
      .exec();
    return { unreadCount: count };
  }

  async getReadCount(userId: string) {
    const count = await this.notificationModel
      .countDocuments({ userId, isRead: true })
      .exec();
    return { readCount: count };
  }

  async getAllCount(userId: string) {
    const count = await this.notificationModel
      .countDocuments({ userId })
      .exec();
    return { totalCount: count };
  }
}