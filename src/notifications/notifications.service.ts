// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) { }

  async create(createNotificationDto: CreateNotificationDto) {
    console.log('🔔 Creating notification for user:', createNotificationDto.userId);
    const createNotification = new this.notificationModel({
      ...createNotificationDto,
      userId: new Types.ObjectId(createNotificationDto.userId),
      leadId: createNotificationDto.leadId ? new Types.ObjectId(createNotificationDto.leadId) : undefined
    });
    const savedNotification = await createNotification.save();
    console.log('✅ Notification saved:', savedNotification._id);
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
      .find({ userId: new Types.ObjectId(userId) })
      .populate('leadId', 'name company')
      .sort({ createdAt: -1 })
      .exec();
    return notifications;
  }

  async findUnreadByUserId(userId: string) {
    console.log('🔍 Fetching unread notifications for user:', userId);
    const notifications = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId), isRead: false })
      .populate('leadId', 'name company')
      .sort({ createdAt: -1 })
      .exec();
    console.log(`📊 Found ${notifications.length} unread notifications`);
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
    const updateData: any = { ...updateNotificationDto };
    if (updateNotificationDto.userId) updateData.userId = new Types.ObjectId(updateNotificationDto.userId);
    if (updateNotificationDto.leadId) updateData.leadId = new Types.ObjectId(updateNotificationDto.leadId);

    const updatedNotification = await this.notificationModel
      .findByIdAndUpdate(id, updateData, { new: true })
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
      .updateMany({ userId: new Types.ObjectId(userId), isRead: false }, { isRead: true })
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
      .countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
      .exec();
    return { unreadCount: count };
  }

  async getReadCount(userId: string) {
    const count = await this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId), isRead: true })
      .exec();
    return { readCount: count };
  }

  async getAllCount(userId: string) {
    const count = await this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId) })
      .exec();
    return { totalCount: count };
  }
}
