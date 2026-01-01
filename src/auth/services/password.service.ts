import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { PasswordReset } from '../schemas/reset.token.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change.password.dto';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from './mailer.service';
import { nanoid } from 'nanoid';

@Injectable()
export class PasswordService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordReset>,
    private jwtService: JwtService,
    private mailService: MailerService,
  ) {}

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { oldPassword, newPassword } = dto;

    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch)
      throw new UnauthorizedException('Old password incorrect');

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (user) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      const resetToken = nanoid(64);

      await this.passwordResetModel.create({
        token: resetToken,
        userId: user._id,
        expiryDate,
      });

      const resetUrl = `http://localhost:3000/password/reset-password/${resetToken}`;
      await this.mailService.sendPasswordReset(email, resetUrl);
    }

    return { message: 'If this email exists, reset link sent' };
  }

  async resetPassword(newPassword: string, resetToken: string) {
    const token = await this.passwordResetModel.findOneAndDelete({
      token: resetToken,
      expiryDate: { $gte: new Date() },
    });
    if (!token) {
      throw new UnauthorizedException('invalid link');
    }
    const user = await this.userModel.findById(token.userId);
    if (!user) {
      throw new InternalServerErrorException();
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }
}
