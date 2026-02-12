import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './guards/auth.guards';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Public root route
  @Get()
  getRoot() {
    return { message: 'API is running 🚀' };
  }

  // Protected route
  @UseGuards(AuthGuard)
  @Get('protected')
  someProtectedRoute(@Req() req) {
    return { message: 'Accessed Resource', userId: req.userId };
  }
}
