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

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

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

      // Get base URL for photo
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      console.log('Base URL:', baseUrl);

      // Construct employee data
      const employeeData = {
        fullName: body.fullName,
        email: body.email,
        phoneNumber: body.phoneNumber,
        password: body.password,
        photo: photo.filename,
        status: 'pending' as const,
      };

      console.log('Employee data constructed:', {
        ...employeeData,
        password: '***HIDDEN***'
      });

      console.log('Calling employeeService.create()...');
      const result = await this.employeeService.create(employeeData, baseUrl);
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
  async create(@Body() data: CreateEmployeeDto, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await this.employeeService.create(data, baseUrl);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Employee created successfully',
      data: result,
    };
  }

  @Get()
  async findAll(@Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await this.employeeService.getAllEmployees(baseUrl);
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
  async getEmployeesByStatus(
    @Param('status') status: string,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const validStatuses = ['pending', 'accept', 'reject'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid status. Must be pending, accept, or reject',
        data: [],
      };
    }

    const result = await this.employeeService.getEmployeesByStatus(status, baseUrl);
    return {
      statusCode: HttpStatus.OK,
      message: `Employees with status '${status}' fetched successfully`,
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await this.employeeService.getEmployeeById(id, baseUrl);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee fetched successfully',
      data: result,
    };
  }

  @Patch('/accept/:id')
  async acceptEmployee(@Param('id') id: string, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await this.employeeService.acceptEmployee(id, baseUrl);
    return {
      statusCode: HttpStatus.OK,
      message: 'Employee accepted successfully',
      data: result,
    };
  }

  @Patch('/reject/:id')
  async rejectEmployee(@Param('id') id: string, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await this.employeeService.rejectEmployee(id, baseUrl);
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
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await this.employeeService.updateEmployee(id, data, baseUrl);
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