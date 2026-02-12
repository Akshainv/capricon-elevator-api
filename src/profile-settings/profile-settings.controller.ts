import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileSettingsService } from './profile-settings.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('profile-settings')
export class ProfileSettingsController {
  constructor(
    private readonly profileSettingsService: ProfileSettingsService,
  ) {}

  /**
   * Extract user ID from JWT token or header (temporary)
   */
  private getUserId(req: any): string {
    // Try to get from JWT token payload first
    if (req.user && req.user.sub) {
      return req.user.sub;
    }
    
    // Fallback to header for testing
    const userId = req.headers['x-user-id'];
    if (!userId) {
      throw new BadRequestException(
        'User ID not found. Ensure you are authenticated.',
      );
    }
    return userId;
  }

  @Get('me')
  getProfile(@Req() req: any) {
    return this.profileSettingsService.getProfile(this.getUserId(req));
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.profileSettingsService.updateProfile(
      this.getUserId(req),
      dto,
    );
  }

  @Patch('notifications')
  updateNotificationSettings(
    @Req() req: any,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.profileSettingsService.updateNotificationSettings(
      this.getUserId(req),
      dto,
    );
  }

  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.profileSettingsService.changePassword(
      this.getUserId(req),
      dto,
    );
  }

  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // ✅ FIX: Pass baseUrl as third parameter
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.profileSettingsService.uploadAvatar(
      this.getUserId(req),
      file,
      baseUrl, // ✅ Added missing baseUrl parameter
    );
  }
}