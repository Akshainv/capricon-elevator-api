import { Body, Controller, Put, UseGuards, Req, Post } from '@nestjs/common';
import { ChangePasswordDto } from '../dto/change.password.dto';
import { forgotPasswordDto } from '../dto/forgot.password.dto';
import { PasswordService } from '../services/password.service';
import { ResetPasswordDto } from '../dto/reset.password.dtos';
import { AuthGuard } from '../../guards/auth.guards';

@Controller('/password')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @UseGuards(AuthGuard)
  @Put('/reset')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.passwordService.changePassword(req.userId, dto);
  }

  @Post('/forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: forgotPasswordDto) {
    return this.passwordService.forgotPassword(forgotPasswordDto.email);
  }

  @Put('/reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.passwordService.resetPassword(
      resetPasswordDto.newPassword,
      resetPasswordDto.resetToken,
    );
  }
}
