// src/lead/lead.service.ts (Backend) - COMPLETE FIXED FILE
import { Injectable, HttpException, HttpStatus, BadRequestException, OnModuleInit } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dtos';
import { UpdateLeadDto } from './dto/update-lead.dtos';
import { InjectModel } from '@nestjs/mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { assignLead, assignLeadDocument } from '../lead/schemas/assign.lead.schema'
import { CreateAssignLeadDto } from '../lead/dto/create-assign-lead.dto';
import { Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Employee, EmployeeDocument } from '../employee/schemas/employeeSchema';

@Injectable()
export class LeadService implements OnModuleInit {
  constructor(
    @InjectModel(Lead.name) private LeadModel: Model<LeadDocument>,
    @InjectModel(assignLead.name)
    private assignLeadModel: Model<assignLeadDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    private notificationsService: NotificationsService,
  ) { }

  async onModuleInit() {
    try {
      // ⚠️ DANGEROUS BUT NECESSARY: Automatically drop the unique index on email
      // This is required because removing 'unique: true' from the schema doesn't drop the index in MongoDB
      console.log('🚀 LeadService: Attempting to drop unique index on email...');
      await this.LeadModel.collection.dropIndex('email_1');
      console.log('✅ LeadService: Successfully dropped "email_1" index.');
    } catch (error) {
      if (error.codeName === 'IndexNotFound' || error.message.includes('index not found')) {
        console.log('ℹ️ LeadService: Unique index "email_1" does not exist. No action needed.');
      } else {
        console.warn('⚠️ LeadService: Unexpected error while dropping index:', error.message);
      }
    }
  }

  async createLead(dto: CreateLeadDto) {
    const lead = await this.LeadModel.create(dto);

    // ✅ NOTIFY ADMINS of new lead (except the creator)
    try {
      const admins = await this.userModel.find({
        role: 'admin',
        _id: { $ne: lead.createdBy }
      }).exec();
      for (const admin of admins) {
        await this.notificationsService.create({
          icon: 'fa-user-plus',
          title: 'New Lead Registered',
          message: `A new lead ${lead.fullName} has registered via ${lead.leadSource}.`,
          time: new Date().toISOString(),
          type: 'info',
          isRead: false,
          userId: admin._id.toString(),
          leadId: lead._id.toString(),
          actionLink: '/admin-leads'
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }

    return {
      message: 'Lead created successfully',
      data: await this.enrichLeadWithCreator(lead),
    };
  }

  private async enrichLeadWithCreator(lead: any) {
    const leadObj = lead.toObject ? lead.toObject() : lead;
    let createdBySalesName = 'Unknown';
    const creatorId = lead.createdBy ? lead.createdBy.toString() : null;

    if (creatorId) {
      try {
        // 1. Try Employee Model
        const employee = await this.employeeModel.findById(creatorId).exec();
        if (employee) {
          createdBySalesName = employee.fullName;
        } else {
          // 2. Try User Model (Admins)
          const user = await this.userModel.findById(creatorId).exec();
          if (user) {
            createdBySalesName = 'Admin (' + (user.email ? user.email.split('@')[0] : 'Unknown') + ')';
          } else {
            // 3. Fallback: Check if creatorId is actually an email (legacy/edge case)
            const userByEmail = await this.userModel.findOne({ email: creatorId }).exec();
            if (userByEmail) {
              createdBySalesName = 'Admin (' + (userByEmail.email ? userByEmail.email.split('@')[0] : 'Unknown') + ')';
            } else {
              const empByEmail = await this.employeeModel.findOne({ email: creatorId }).exec();
              if (empByEmail) {
                createdBySalesName = empByEmail.fullName;
              } else {
                // If nothing found, return early with ID for frontend fallback
                console.warn(`[WARN] No creator found for ID/Email: ${creatorId}`);
                createdBySalesName = creatorId;
              }
            }
          }
        }
      } catch (err) {
        console.error(`[ERROR] Failed to resolve creator for ${creatorId}:`, err);
        createdBySalesName = creatorId; // Pass ID on error
      }
    }
    return { ...leadObj, createdBySalesName };
  }

  async getAllLeads() {
    const leads = await this.LeadModel.find().exec();
    if (!leads || leads.length === 0) {
      console.log('[DEBUG] getAllLeads: No leads found. Returning empty list.');
      return {
        message: 'No leads found',
        count: 0,
        data: [],
      };
    }

    console.log(`[DEBUG] getAllLeads: Found ${leads.length} leads. Resolving creator names...`);

    // Resolve createdBy names
    const enrichedLeads = await Promise.all(leads.map(lead => this.enrichLeadWithCreator(lead)));

    return {
      message: 'Leads fetched successfully',
      count: enrichedLeads.length,
      data: enrichedLeads,
    };
  }

  async getLeadById(id: string) {
    const lead = await this.LeadModel.findById(id).exec();
    if (!lead) {
      throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Lead fetched successfully',
      data: await this.enrichLeadWithCreator(lead),
    };
  }

  async getLeadsCreatedBy(userId: string) {
    console.log(`[DEBUG] getLeadsCreatedBy: Resolving identifiers for ${userId}`);

    // Resolve email for the given userId to support email-based queries
    let userEmail = '';
    const employee = await this.employeeModel.findById(userId).exec();
    if (employee) {
      userEmail = employee.email;
    } else {
      const user = await this.userModel.findById(userId).exec();
      if (user) userEmail = user.email;
    }

    const query: any = {
      $or: [
        { createdBy: userId },
        { createdBy: userEmail }
      ],
      $and: [
        {
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: '' },
            { assignedTo: userId },
            { assignedTo: userEmail }
          ]
        },
        {
          $or: [
            { isConverted: { $exists: false } },
            { isConverted: false }
          ]
        }
      ]
    };

    console.log(`[DEBUG] getLeadsCreatedBy Query:`, JSON.stringify(query));
    const leads = await this.LeadModel.find(query).exec();

    const enrichedLeads = await Promise.all(leads.map(lead => this.enrichLeadWithCreator(lead)));

    return {
      message: 'Leads created by user fetched successfully',
      count: enrichedLeads.length,
      data: enrichedLeads,
    };
  }

  async getLeadsAssignedToButNotCreatedBy(userId: string) {
    console.log(`[DEBUG] getLeadsAssignedToButNotCreatedBy: Resolving identifiers for ${userId}`);

    // Resolve email for the given userId
    let userEmail = '';
    const employee = await this.employeeModel.findById(userId).exec();
    if (employee) {
      userEmail = employee.email;
    } else {
      const user = await this.userModel.findById(userId).exec();
      if (user) userEmail = user.email;
    }

    const query: any = {
      $and: [
        {
          $or: [
            { assignedTo: userId },
            { assignedTo: userEmail }
          ]
        },
        { createdBy: { $nin: [userId, userEmail] } },
        {
          $or: [
            { isConverted: { $exists: false } },
            { isConverted: false }
          ]
        }
      ]
    };

    console.log(`[DEBUG] getLeadsAssignedToQuery Query:`, JSON.stringify(query));
    const leads = await this.LeadModel.find(query).exec();

    console.log(`Backend: Found ${leads.length} leads assigned to user ${userId}`);
    leads.forEach(lead => {
      console.log(`  - Lead: ${lead.fullName}, assignedTo: ${lead.assignedTo}, createdBy: ${lead.createdBy}, status: ${lead.status}`);
    });

    const enrichedLeads = await Promise.all(leads.map(lead => this.enrichLeadWithCreator(lead)));

    return {
      message: 'Leads assigned to user fetched successfully',
      count: enrichedLeads.length,
      data: enrichedLeads,
    };
  }

  // ✅ FIXED: Changed 'New' to 'Seeded Lead' to match schema
  async getUnassignedAndUnconvertedLeads() {
    const leads = await this.LeadModel.find({
      status: 'Seeded Lead',  // ✅ FIXED: Was 'New', now 'Seeded Lead'
      $and: [
        {
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: '' }
          ]
        },
        {
          $or: [
            { isConverted: { $exists: false } },
            { isConverted: false }
          ]
        }
      ]
    }).exec();

    const enrichedLeads = await Promise.all(leads.map(lead => this.enrichLeadWithCreator(lead)));

    return {
      message: 'Unassigned and unconverted leads fetched successfully',
      count: enrichedLeads.length,
      data: enrichedLeads,
    };
  }

  // ✅ Use $set to update ONLY provided fields
  async updateLead(id: string, dto: UpdateLeadDto) {
    console.log('==============================================');
    console.log('Backend Service: Updating lead:', id);
    console.log('Update data:', dto);
    console.log('Fields being updated:', Object.keys(dto));
    console.log('==============================================');

    const updatedLead = await this.LeadModel.findByIdAndUpdate(
      id,
      { $set: dto },
      {
        new: true,
        runValidators: true
      }
    ).exec();

    if (!updatedLead) {
      throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
    }

    console.log('==============================================');
    console.log('Backend Service: Lead updated successfully');
    console.log('Updated lead status:', updatedLead.status);
    console.log('==============================================');

    return {
      message: 'Lead updated successfully',
      data: await this.enrichLeadWithCreator(updatedLead),
    };
  }

  // ✅ DEDICATED STATUS UPDATE: Update ONLY the status field
  async updateLeadStatus(id: string, status: string) {
    console.log('==============================================');
    console.log('Backend Service: Updating lead STATUS');
    console.log('Lead ID:', id);
    console.log('New status:', status);
    console.log('==============================================');

    const updatedLead = await this.LeadModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLead) {
      throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
    }

    console.log('==============================================');
    console.log('Backend Service: Status updated successfully');
    console.log('New status in DB:', updatedLead.status);
    console.log('==============================================');

    return {
      message: 'Lead status updated successfully',
      data: await this.enrichLeadWithCreator(updatedLead),
    };
  }

  async removeLead(id: string) {
    const deletedLead = await this.LeadModel.findByIdAndDelete(id).exec();
    if (!deletedLead) {
      throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
    }
    return {
      message: 'Lead deleted successfully',
      data: deletedLead,
    };
  }

  async createAssign(dto: CreateAssignLeadDto) {
    console.log('==============================================');
    console.log('Backend: Starting lead assignment process');
    console.log('Lead IDs:', dto.leadIds);
    console.log('Assigned to:', dto.assignedSales);
    console.log('==============================================');

    const existingLeads = await this.LeadModel.find({
      _id: { $in: dto.leadIds },
    });

    if (existingLeads.length !== dto.leadIds.length) {
      throw new BadRequestException('Some leadIds are invalid or do not exist');
    }

    console.log(`Backend: Found ${existingLeads.length} leads to assign`);

    const assign = new this.assignLeadModel({
      leadIds: dto.leadIds,
      assignedSales: dto.assignedSales,
      leadCount: dto.leadIds.length,
      notes: dto.notes || '',
    });

    const savedAssignment = await assign.save();
    console.log('Backend: Assignment record created:', savedAssignment._id);

    // ✅ NOTIFY EMPLOYEE of new assignment
    try {
      await this.notificationsService.create({
        icon: 'fa-user-check',
        title: 'New Lead Assigned',
        message: `You have been assigned ${dto.leadIds.length} new lead(s).`,
        time: new Date().toISOString(),
        type: 'success',
        isRead: false,
        userId: dto.assignedSales,
        actionLink: '/leads'
      });
    } catch (error) {
      console.error('Failed to send employee notification:', error);
    }

    // ✅ When assigning leads, keep status as 'Seeded Lead'
    const updateResult = await this.LeadModel.updateMany(
      { _id: { $in: dto.leadIds } },
      {
        $set: {
          assignedTo: dto.assignedSales,
          status: 'Seeded Lead'  // ✅ FIXED: Changed from 'Meeting Fixed' to 'Seeded Lead'
        }
      }
    ).exec();

    console.log('==============================================');
    console.log('Backend: Update completed');
    console.log('Matched documents:', updateResult.matchedCount);
    console.log('Modified documents:', updateResult.modifiedCount);
    console.log('==============================================');

    const updatedLeads = await this.LeadModel.find({
      _id: { $in: dto.leadIds }
    }).exec();

    console.log('Backend: Verification - Updated leads:');
    updatedLeads.forEach(lead => {
      console.log(`  - ${lead.fullName}: assignedTo=${lead.assignedTo}, status=${lead.status}`);
    });

    return {
      _id: savedAssignment._id,
      leadIds: savedAssignment.leadIds,
      assignedSales: savedAssignment.assignedSales,
      leadCount: savedAssignment.leadCount,
      notes: savedAssignment.notes,
      updatedLeads: updatedLeads,
      updateResult: {
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      }
    };
  }

  async findAllAssign() {
    const assignments = await this.assignLeadModel
      .find()
      .populate({
        path: 'leadIds',
        select: 'fullName email phoneNumber leadSource status assignedTo createdBy',
      })
      .exec();

    if (!assignments || assignments.length === 0) {
      throw new BadRequestException('No lead assignments found');
    }

    return assignments;
  }

  async findOneAssign(id: string) {
    const lead = await this.LeadModel.findById(id).exec();
    if (!lead) {
      throw new BadRequestException('Lead not found');
    }

    const assignments = await this.assignLeadModel
      .find({ leadIds: id })
      .populate({
        path: 'leadIds',
        select: 'fullName email phoneNumber leadSource status assignedTo createdBy',
      })
      .exec();

    const leadCount = assignments.length;

    await this.assignLeadModel.updateMany(
      { leadIds: id },
      { $set: { leadCount: leadCount } },
    );

    return { lead, leadCount, assignments };
  }
}