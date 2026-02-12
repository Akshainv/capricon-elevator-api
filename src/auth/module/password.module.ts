import { Module } from '@nestjs/common';
import { PasswordController } from '../controllers/password.controller';
import { PasswordService } from '../services/password.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { PasswordReset, PasswordResetSchema } from '../schemas/reset.token.schema';
import { MailerService } from '../services/mailer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },  // ✅ ADD THIS
    ]),
  ],
  controllers: [PasswordController],
  providers: [PasswordService, MailerService],
  exports: [PasswordService],
})
export class PasswordModule {}
