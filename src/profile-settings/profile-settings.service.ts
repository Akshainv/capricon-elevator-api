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

@Injectable()
export class ProfileSettingsService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  private validateUserId(userId: string) {
    if (!userId) throw new BadRequestException('User ID is required');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid user ID');
  }

  async getProfile(userId: string) {
    this.validateUserId(userId);
    const employee = await this.employeeModel.findById(userId).select('-password -__v');
    if (!employee) throw new NotFoundException('Employee not found');
    
    const employeeObj = employee.toObject();
    
    // ✅ FIX: Properly map profileImage from either profileImage or photo field
    let profileImageUrl = employeeObj.profileImage;
    
    // If profileImage doesn't exist but photo exists, construct URL from photo
    if (!profileImageUrl && employeeObj.photo) {
      // Check if photo is already a full URL
      if (employeeObj.photo.startsWith('http')) {
        profileImageUrl = employeeObj.photo;
      } else {
        // Construct full URL from filename
        profileImageUrl = `http://localhost:3000/uploads/${employeeObj.photo}`;
      }
    }
    
    return {
      ...employeeObj,
      phone: employeeObj.phoneNumber,
      role: 'sales',
      department: employeeObj.department || 'Sales',
      profileImage: profileImageUrl || 'assets/images/logo1.png', // ✅ Always return profileImage
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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
    
    // ✅ FIX: Include profileImage in response
    let profileImageUrl = employeeObj.profileImage;
    if (!profileImageUrl && employeeObj.photo) {
      if (employeeObj.photo.startsWith('http')) {
        profileImageUrl = employeeObj.photo;
      } else {
        profileImageUrl = `http://localhost:3000/uploads/${employeeObj.photo}`;
      }
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
    
    const avatarUrl = `${baseUrl}/uploads/${file.filename}`;

    // ✅ FIX: Update both profileImage and photo fields
    const updated = await this.employeeModel.findByIdAndUpdate(
      userId,
      { 
        profileImage: avatarUrl, 
        photo: file.filename 
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