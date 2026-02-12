import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type EmployeeDocument = HydratedDocument<Employee>;

// Notification Preferences Interface
export interface NotificationPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  leadAssignments?: boolean;
  dealUpdates?: boolean;
  quotationApprovals?: boolean;
  taskReminders?: boolean;
  followUpAlerts?: boolean;
}

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  photo?: string;

  @Prop({ required: true })
  employeeId: string;

  @Prop({ 
    enum: ['pending', 'accept', 'reject'], 
    default: 'pending' 
  })
  status: string;

  // ✅ NEW FIELDS
  @Prop()
  location?: string;

  @Prop()
  department?: string;

  @Prop()
  bio?: string;

  @Prop()
  profileImage?: string;

  @Prop({ type: Object })
  notificationPreferences?: NotificationPreferences;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

// ===============================================
// 🔥 MIDDLEWARE: Hash password before saving
// ===============================================
EmployeeSchema.pre('save', async function (next) {
  const employee = this as EmployeeDocument;

  // Only hash the password if it has been modified (or is new)
  if (!employee.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(employee.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});