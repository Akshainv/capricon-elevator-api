import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebsiteLead, WebsiteLeadDocument } from './schemas/website-lead.schema';
import { Lead, LeadDocument } from '../lead/schemas/lead.schema';
import { assignLead, assignLeadDocument } from '../lead/schemas/assign.lead.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Employee, EmployeeDocument } from '../employee/schemas/employeeSchema';

@Injectable()
export class WebsiteLeadsService {
    constructor(
        @InjectModel(WebsiteLead.name) private websiteLeadModel: Model<WebsiteLeadDocument>,
        @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
        @InjectModel(assignLead.name) private assignLeadModel: Model<assignLeadDocument>,
        @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
        private notificationsService: NotificationsService
    ) { }

    async createWebhookLead(data: any) {
        try {
            // Clean up keys matching Contact Form 7 or standard formats
            const mappedData = {
                name: data['your-name'] || data.name || data.Name || data.firstName || 'Unknown',
                email: data['your-email'] || data.email || data.Email || '',
                phone: data['tel-735'] || data.phone || data.Phone || data.phoneNumber || '',
                elevatorType: data['select-575'] || data.elevatorType || data.type || '',
                message: data['your-message'] || data.message || data.Message || data.body || '',
                source: 'Landing Page Form'
            };

            console.log('🌐 Received Website Webhook Data mapped to:', mappedData);

            // Save to database
            const newLead = await this.websiteLeadModel.create(mappedData);

            return {
                message: 'Lead captured successfully',
                leadId: newLead._id
            };
        } catch (error) {
            console.error('❌ Failed to process website webhook:', error);
            throw new HttpException('Failed to process lead', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createWebsiteLead(data: any) {
        try {
            const newLead = await this.websiteLeadModel.create({
                name: data.name,
                email: data.email,
                phone: data.phone,
                elevatorType: data.elevatorType || data.passengerType,
                source: 'website'
            });

            console.log('✅ Created Website Lead in websiteleads collection:', newLead._id);

            return {
                message: 'Lead created successfully',
                data: newLead
            };
        } catch (error) {
            console.error('❌ Failed to create website lead:', error);
            throw new HttpException('Failed to create lead', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async findAll() {
        return this.websiteLeadModel.find().sort({ createdAt: -1 }).exec();
    }

    async assignWebsiteLead(id: string, employeeId: string, adminId: string) {
        try {
            const websiteLead = await this.websiteLeadModel.findById(id);
            if (!websiteLead) {
                throw new HttpException('Website lead not found', HttpStatus.NOT_FOUND);
            }

            // 1. Create a regular lead
            const newLeadData = {
                fullName: websiteLead.name,
                email: websiteLead.email,
                phoneNumber: websiteLead.phone,
                leadSource: 'Website',
                status: 'Seeded Lead',
                assignedTo: new Types.ObjectId(employeeId),
                createdBy: new Types.ObjectId(adminId),
                notes: `Elevator Type: ${websiteLead.elevatorType || 'N/A'} | Source: WordPress Landing Page`,
                isConverted: false
            };

            const createdLead = await this.leadModel.create(newLeadData);

            // 2. Create assignment record
            const assignment = new this.assignLeadModel({
                leadIds: [createdLead._id],
                assignedSales: employeeId,
                leadCount: 1,
                notes: 'Automatically migrated and assigned from Website Leads'
            });
            await assignment.save();

            // 3. Send Notification
            try {
                await this.notificationsService.create({
                    icon: 'fa-user-check',
                    title: 'New Website Lead Assigned',
                    message: `You have been assigned a new website lead: ${websiteLead.name}`,
                    time: new Date().toISOString(),
                    type: 'success',
                    isRead: false,
                    userId: employeeId,
                    actionLink: '/leads',
                    leadId: createdLead._id.toString()
                } as any);
            } catch (err) {
                console.error('Failed to send notification:', err);
            }

            // 4. Delete the website lead
            await this.websiteLeadModel.findByIdAndDelete(id);

            return {
                message: 'Lead migrated and assigned successfully',
                data: createdLead
            };
        } catch (error) {
            console.error('❌ Failed to assign website lead:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException(error.message || 'Failed to assign lead', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
