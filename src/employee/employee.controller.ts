import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('employee')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post('/register')
  @UseInterceptors(FileInterceptor('photo'))
  async register(
    @Body() body: any,
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: Request,
  ) {
    try {
      console.log('==========================================');
      console.log('REGISTER ENDPOINT HIT');
      console.log('==========================================');
      console.log('Request Headers:', req.headers);
      console.log('Body received:', body);
      console.log('Photo received:', photo);
      console.log('==========================================');

      // Validate required fields
      if (!body.fullName || !body.email || !body.phoneNumber || !body.password) {
        console.log('❌ Validation failed: Missing required fields');
        console.log('fullName:', body.fullName);
        console.log('email:', body.email);
        console.log('phoneNumber:', body.phoneNumber);
        console.log('password:', body.password ? '***' : 'MISSING');
        throw new BadRequestException('All required fields must be provided');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        console.log('❌ Invalid email format:', body.email);
        throw new BadRequestException('Invalid email format');
      }

      // Validate photo upload
      if (!photo) {
        console.log('❌ Photo is missing');
        throw new BadRequestException('Photo is required');
      }

      console.log('✅ All validations passed');

      // Upload photo to Cloudinary
      console.log('Uploading photo to Cloudinary...');
      const photoUrl = await this.cloudinaryService.uploadImage(photo, 'employee-photos');
      console.log('✅ Photo uploaded to Cloudinary:', photoUrl);

      // Construct employee data
      const employeeData = {
        fullName: body.fullName,
        email: body.email,
        phoneNumber: body.phoneNumber,
        password: body.password,
        photo: photoUrl,
        status: 'pending' as const,
      };

      console.log('Employee data constructed:', {
        ...employeeData,
        password: '***HIDDEN***'
      });

      console.log('Calling employeeService.create()...');
      const result = await this.employeeService.create(employeeData);
      console.log('✅ Service returned successfully:', result);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Employee registered successfully. Pending admin approval.',
        data: result,
      };
    } catch (error) {
      console.error('==========================================');
      console.error('❌ ERROR IN REGISTER ENDPOINT:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('==========================================');
      throw error;
    }
  }

  @Post()
  async create(@Body() data: CreateEmployeeDto) {
    const result = await this.employeeService.create(data);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Employee created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.employeeService.getAllEmployees();
    return {
      statusCode: HttpStatus.OK,
      message: 'All employees fetched successfully',
      data: result,
    };
  }

  @Get('/stats')
  async getEmployeeStats() {
    const result = await this.employeeService.getEmployeeStats();
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee stats fetched successfully',
      data: result,
    };
  }

  @Get('/status/:status')
  async getEmployeesByStatus(@Param('status') status: string) {
    const validStatuses = ['pending', 'accept', 'reject'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid status. Must be pending, accept, or reject',
        data: [],
      };
    }

    const result = await this.employeeService.getEmployeesByStatus(status);
    return {
      statusCode: HttpStatus.OK,
      message: `Employees with status '${status}' fetched successfully`,
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.employeeService.getEmployeeById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee fetched successfully',
      data: result,
    };
  }

  @Patch('/accept/:id')
  async acceptEmployee(@Param('id') id: string) {
    const result = await this.employeeService.acceptEmployee(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee accepted successfully',
      data: result,
    };
  }

  @Patch('/reject/:id')
  async rejectEmployee(@Param('id') id: string) {
    const result = await this.employeeService.rejectEmployee(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee rejected successfully',
      data: result,
    };
  }

  @Patch(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() data: UpdateEmployeeDto,
  ) {
    const result = await this.employeeService.updateEmployee(id, data);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.employeeService.removeEmployee(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee deleted successfully',
      data: result,
    };
  }
}