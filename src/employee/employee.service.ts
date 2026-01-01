import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employeeSchema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name)
    private employeeModel: Model<EmployeeDocument>,
  ) {}

  async generateEmployeeId(): Promise<string> {
    // Find the last employee sorted by employeeId in descending order
    const lastEmployee = await this.employeeModel
      .findOne()
      .sort({ employeeId: -1 })
      .exec();

    if (!lastEmployee) {
      // No employees exist, start with EMP001
      return 'EMP001';
    }

    // Extract the numeric part from the last employeeId (e.g., "EMP012" → 12)
    const lastId = parseInt(lastEmployee.employeeId.replace('EMP', ''), 10);
    const nextId = lastId + 1;

    // Format with leading zeros (e.g., 13 → "EMP013")
    return 'EMP' + nextId.toString().padStart(3, '0');
  }

  // Helper method to construct full photo URL
  private constructPhotoUrl(photo: string | undefined, baseUrl: string): string | undefined {
    if (!photo) return undefined;
    return `${baseUrl}/uploads/${photo}`;
  }

  // Helper method to format employee with photo URL
  private formatEmployee(employee: EmployeeDocument, baseUrl: string) {
    const employeeObj = employee.toObject();
    return {
      ...employeeObj,
      photo: this.constructPhotoUrl(employeeObj.photo, baseUrl),
    };
  }

  async create(data: CreateEmployeeDto, baseUrl: string): Promise<any> {
    const existing = await this.employeeModel.findOne({ email: data.email });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const employee = new this.employeeModel({
      ...data,
      employeeId: await this.generateEmployeeId(),
    });

    const savedEmployee = await employee.save();
    return this.formatEmployee(savedEmployee, baseUrl);
  }

  async getAllEmployees(baseUrl: string) {
    const employees = await this.employeeModel.find();
    if (!employees.length) {
      throw new HttpException('No employees found', HttpStatus.NOT_FOUND);
    }
    return employees.map(emp => this.formatEmployee(emp, baseUrl));
  }

  async getEmployeeById(id: string, baseUrl: string) {
    const employee = await this.employeeModel.findById(id);
    if (!employee) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }
    return this.formatEmployee(employee, baseUrl);
  }

  // NEW METHOD: Get employees by status
  async getEmployeesByStatus(status: string, baseUrl: string) {
    const employees = await this.employeeModel.find({ status }).exec();
    
    if (!employees || employees.length === 0) {
      // Don't throw error, just return empty array for better UX
      return [];
    }
    
    return employees.map(emp => this.formatEmployee(emp, baseUrl));
  }

  async acceptEmployee(id: string, baseUrl: string) {
    const employee = await this.employeeModel.findById(id);

    if (!employee) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }

    if (employee.status !== 'pending') {
      throw new BadRequestException(
        'Only pending employees can be accepted',
      );
    }

    const updated = await this.employeeModel.findByIdAndUpdate(
      id,
      { status: 'accept' },
      { new: true },
    );

    if (!updated) {
      throw new HttpException('Failed to update employee', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return this.formatEmployee(updated, baseUrl);
  }

  async rejectEmployee(id: string, baseUrl: string) {
    const employee = await this.employeeModel.findById(id);

    if (!employee) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }

    if (employee.status !== 'pending') {
      throw new BadRequestException(
        'Only pending employees can be rejected',
      );
    }

    const updated = await this.employeeModel.findByIdAndUpdate(
      id,
      { status: 'reject' },
      { new: true },
    );

    if (!updated) {
      throw new HttpException('Failed to update employee', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return this.formatEmployee(updated, baseUrl);
  }

  async updateEmployee(id: string, data: UpdateEmployeeDto, baseUrl: string) {
    const updated = await this.employeeModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );

    if (!updated) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }

    return this.formatEmployee(updated, baseUrl);
  }

  async removeEmployee(id: string) {
    const deleted = await this.employeeModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }

    return deleted;
  }

  async getEmployeeStats() {
    const pending = await this.employeeModel.countDocuments({ status: 'pending' });
    const approved = await this.employeeModel.countDocuments({ status: 'accept' });
    const rejected = await this.employeeModel.countDocuments({ status: 'reject' });
    const total = await this.employeeModel.countDocuments();

    return {
      pending,
      approved,
      rejected,
      total,
    };
  }
}