import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Employee, EmployeeDocument } from '../employee/schemas/employeeSchema';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProfileSettingsService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  private validateUserId(userId: string) {
    if (!userId) throw new BadRequestException('User ID is required');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid user ID');
  }

  async getProfile(userId: string, baseUrl: string) {
    this.validateUserId(userId);
    const employee = await this.employeeModel.findById(userId).select('-password -__v');
    if (!employee) throw new NotFoundException('Employee not found');

    const employeeObj = employee.toObject();

    // Use profileImage or photo field
    // PRIORITIZE CLOUDINARY URL: If photo is a URL (starts with http), use it preferentially
    let profileImageUrl = employeeObj.profileImage;

    if (employeeObj.photo && (employeeObj.photo.startsWith('http') || employeeObj.photo.startsWith('https'))) {
      profileImageUrl = employeeObj.photo;
    } else {
      profileImageUrl = employeeObj.profileImage || employeeObj.photo || undefined;
    }

    if (profileImageUrl && !profileImageUrl.startsWith('http')) {
      profileImageUrl = `${baseUrl}/uploads/${profileImageUrl}`;
    }

    return {
      ...employeeObj,
      phone: employeeObj.phoneNumber,
      role: 'sales',
      department: employeeObj.department || 'Sales',
      profileImage: profileImageUrl || 'assets/images/logo1.png', // ✅ Always return profileImage
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, baseUrl: string) {
    this.validateUserId(userId);

    const updateData: any = { ...dto };
    if (dto.phone) {
      updateData.phoneNumber = dto.phone;
      delete updateData.phone;
    }

    updateData.department = 'Sales';

    const updated = await this.employeeModel
      .findByIdAndUpdate(userId, updateData, { new: true, runValidators: true })
      .select('-password -__v');

    if (!updated) throw new NotFoundException('Employee not found');

    const employeeObj = updated.toObject();

    // Use profileImage or photo field
    // PRIORITIZE CLOUDINARY URL: If photo is a URL (starts with http), use it preferentially
    let profileImageUrl = employeeObj.profileImage;

    if (employeeObj.photo && (employeeObj.photo.startsWith('http') || employeeObj.photo.startsWith('https'))) {
      profileImageUrl = employeeObj.photo;
    } else {
      profileImageUrl = employeeObj.profileImage || employeeObj.photo || undefined;
    }

    if (profileImageUrl && !profileImageUrl.startsWith('http')) {
      profileImageUrl = `${baseUrl}/uploads/${profileImageUrl}`;
    }

    return {
      message: 'Profile updated successfully',
      user: {
        ...employeeObj,
        phone: employeeObj.phoneNumber,
        role: 'sales',
        department: 'Sales',
        profileImage: profileImageUrl || 'assets/images/logo1.png', // ✅ Always return profileImage
      }
    };
  }

  async updateNotificationSettings(userId: string, dto: UpdateSettingsDto) {
    this.validateUserId(userId);

    const updated = await this.employeeModel.findByIdAndUpdate(
      userId,
      { notificationPreferences: dto },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Employee not found');

    return {
      message: 'Notification preferences updated successfully',
      notificationPreferences: updated.notificationPreferences,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.validateUserId(userId);
    const { currentPassword, newPassword, confirmPassword } = dto;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new BadRequestException('All password fields are required');
    }

    if (newPassword !== confirmPassword)
      throw new BadRequestException('Passwords do not match');

    const employee = await this.employeeModel.findById(userId).select('+password');
    if (!employee || !employee.password) throw new NotFoundException('Employee not found');

    const isValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isValid)
      throw new UnauthorizedException('Current password is incorrect');

    employee.password = newPassword;
    await employee.save();

    return { message: 'Password changed successfully' };
  }

  async uploadAvatar(userId: string, file: any, baseUrl: string) {
    this.validateUserId(userId);

    // Upload to Cloudinary
    const avatarUrl = await this.cloudinaryService.uploadImage(file, 'employee-avatars');

    // Update both profileImage and photo fields
    const updated = await this.employeeModel.findByIdAndUpdate(
      userId,
      {
        profileImage: avatarUrl,
        photo: avatarUrl
      },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Employee not found');

    return {
      message: 'Avatar uploaded successfully',
      profileImage: avatarUrl
    };
  }
}