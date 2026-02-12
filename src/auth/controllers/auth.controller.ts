                                                                                                                                                                                                                                                                                                                                  import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SignupDto } from '../dto/signup.dtos';
import { LoginDto } from '../dto/login.dtos';

@Controller('/')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.commonLogin(credentials);
  }

  @Post('/admin')                
  async adminSignup(@Body() signUpData: SignupDto) {
    return this.authService.signUp(signUpData);                                          
  }

  @Get('/admin')
  async getAllAdmins() {
    return this.authService.getAllAdmins();
  }

  @Get('/admin/profile/:id')
  async getAdminProfile(@Param('id') id: string) {
    return this.authService.getAdminProfile(id);
  }
}
           