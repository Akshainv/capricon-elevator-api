import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException
} from '@nestjs/common';
import { SignupDto } from '../dto/signup.dtos';
import { LoginDto } from '../dto/login.dtos';
import { User } from '../schemas/user.schema';
import { Employee, EmployeeDocument } from 'src/employee/schemas/employeeSchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(Employee.name) private EmployeeModel: Model<EmployeeDocument>,
    private jwtService: JwtService,
  ) {}


  async commonLogin(credentials: LoginDto) {
    const { email, password } = credentials;

    // ============================================
    // 1. CHECK IF USER IS AN ADMIN
    // ============================================
    const admin = await this.UserModel.findOne({ email });
    console.log("admin",admin);
    
    

    if (admin) {
      // Compare password (Assuming Admin password is also hashed via bcrypt)
      const isMatch = await bcrypt.compare(password, admin.password);
      console.log("admin match ",isMatch);
      
      
      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate Token for Admin
      return this.generateResponse(admin._id.toString(), admin.email, admin.role);
    }

    // ============================================
    // 2. CHECK IF USER IS AN EMPLOYEE
    // ============================================
    const employee = await this.EmployeeModel.findOne({ email });
    console.log("sdasds",employee);
    

    if (employee) {
      // A. Check Status Rule
      if (employee.status !== 'accept') {
        throw new ForbiddenException('Your account is pending approval or has been rejected.');
      }
console.log("employee passw",employee.password);
console.log("password",password);


      // B. Compare Password
      const isMatch = await bcrypt.compare(password, employee.password);
      console.log("zsdassdas",isMatch);
      

      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate Token for Employee
      // Note: Employee DB has no role, so we manually assign 'employee'
      return this.generateResponse(employee._id.toString(), employee.email, 'employee');
    }

    // ============================================
    // 3. NO USER FOUND
    // ============================================
    throw new UnauthorizedException('Invalid credentials');
  }

  // Helper to generate JWT response
  private async generateResponse(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        email,
        role,
        userId
      }
    };
  }

  // Admin signup
  async signUp(signUpData: SignupDto) {
    const { email, password } = signUpData;

    const existing = await this.UserModel.findOne({ email });
    if (existing) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await this.UserModel.create({
      email,
      password: password,
      role: 'admin',
    });

    return { message: 'Admin account created successfully', admin };
  }

  // Fetch all admins
  async getAllAdmins() {
    const admins = await this.UserModel.find({ role: 'admin' }).select('-password');
    return { message: 'Admins fetched successfully', count: admins.length, data: admins };
  }

  // Get admin profile
  async getAdminProfile(id: string) {
    const admin = await this.UserModel.findOne({ _id: id, role: 'admin' }).select('-password');
    if (!admin) throw new BadRequestException('Admin not found');
    return { message: 'Admin profile fetched successfully', data: admin };
  }

  // ✅ Add generateToken method here
  private generateToken(userId: string, role: 'admin' | 'employee') {
    return this.jwtService.sign({ userId, role });
  }
}
