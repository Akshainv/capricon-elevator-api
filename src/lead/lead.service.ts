// src/lead/lead.service.ts (Backend) - FIXED VERSION
import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dtos';
import { UpdateLeadDto } from './dto/update-lead.dtos';
import { InjectModel } from '@nestjs/mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { assignLead, assignLeadDocument } from '../lead/schemas/assign.lead.schema'
import { CreateAssignLeadDto } from '../lead/dto/create-assign-lead.dto';
import { Model } from 'mongoose';

@Injectable()
export class LeadService {
  constructor(
    @InjectModel(Lead.name) private LeadModel: Model<LeadDocument>,
    @InjectModel(assignLead.name)
    private assignLeadModel: Model<assignLeadDocument>,
  ) {}

  async createLead(dto: CreateLeadDto) {
    const existingLead = await this.LeadModel.findOne({
      $or: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    }).exec();

    if (existingLead) {
      throw new HttpException(
        'Lead with the same email or phone number already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    const lead = await this.LeadModel.create(dto);

    return {
      message: 'Lead created successfully',
      data: lead,
    };
  }

  async getAllLeads() {
    const leads = await this.LeadModel.find().exec();
    if (!leads || leads.length === 0) {
      throw new HttpException('No leads found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Leads fetched successfully',
      count: leads.length,
      data: leads,
    };
  }

  async getLeadById(id: string) {
    const lead = await this.LeadModel.findById(id).exec();
    if (!lead) {
      throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Lead fetched successfully',
      data: lead,
    };
  }

  // Get leads created by a specific user (excluding assigned and converted ones)
  async getLeadsCreatedBy(userId: string) {
    const leads = await this.LeadModel.find({ 
      createdBy: userId,
      $and: [
        {
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: '' },
            { assignedTo: userId }
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
    
    return {
      message: 'Leads created by user fetched successfully',
      count: leads.length,
      data: leads,
    };
  }

  // ✅ FIXED: Get leads assigned to a user (by admin)
  // Show ALL leads assigned to this user regardless of status
  async getLeadsAssignedToButNotCreatedBy(userId: string) {
    const leads = await this.LeadModel.find({ 
      assignedTo: userId,
      createdBy: { $ne: userId }, // ✅ CRITICAL: Exclude leads created by this user
      $or: [
        { isConverted: { $exists: false } },
        { isConverted: false }
      ]
    }).exec();
    
    console.log(`Backend: Found ${leads.length} leads assigned to user ${userId}`);
    leads.forEach(lead => {
      console.log(`  - Lead: ${lead.fullName}, assignedTo: ${lead.assignedTo}, createdBy: ${lead.createdBy}, status: ${lead.status}`);
    });
    
    return {
      message: 'Leads assigned to user fetched successfully',
      count: leads.length,
      data: leads,
    };
  }

  // Get unassigned and unconverted leads for admin assignment
  async getUnassignedAndUnconvertedLeads() {
    const leads = await this.LeadModel.find({
      status: 'New',
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
    
    return {
      message: 'Unassigned and unconverted leads fetched successfully',
      count: leads.length,
      data: leads,
    };
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    const updatedLead = await this.LeadModel.findByIdAndUpdate(id, dto, {
      new: true,
    }).exec();

    if (!updatedLead) {
      throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
    }

    console.log(`Backend: Lead ${id} updated:`, {
      fullName: updatedLead.fullName,
      assignedTo: updatedLead.assignedTo,
      createdBy: updatedLead.createdBy,
      status: updatedLead.status,
      isConverted: updatedLead.isConverted
    });

    return {
      message: 'Lead updated successfully',
      data: updatedLead,
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

  // ✅ CRITICAL FIX: Ensure atomic updates with proper await and error handling
  async createAssign(dto: CreateAssignLeadDto) {
    console.log('==============================================');
    console.log('Backend: Starting lead assignment process');
    console.log('Lead IDs:', dto.leadIds);
    console.log('Assigned to:', dto.assignedSales);
    console.log('==============================================');

    // Verify all leads exist
    const existingLeads = await this.LeadModel.find({
      _id: { $in: dto.leadIds },
    });

    if (existingLeads.length !== dto.leadIds.length) {
      throw new BadRequestException('Some leadIds are invalid or do not exist');
    }

    console.log(`Backend: Found ${existingLeads.length} leads to assign`);
    
    // Create assignment record first
    const assign = new this.assignLeadModel({
      leadIds: dto.leadIds,
      assignedSales: dto.assignedSales,
      leadCount: dto.leadIds.length,
      notes: dto.notes || '',
    });

    // Save assignment
    const savedAssignment = await assign.save();
    console.log('Backend: Assignment record created:', savedAssignment._id);

    // ✅ CRITICAL FIX: Use updateMany with proper await to ensure all leads are updated
    // This ensures MongoDB writes are completed before returning
    const updateResult = await this.LeadModel.updateMany(
      { _id: { $in: dto.leadIds } },
      { 
        $set: { 
          assignedTo: dto.assignedSales,
          status: 'Qualified' // Change status from 'New' to 'Qualified'
        } 
      }
    ).exec(); // ✅ Added .exec() for proper promise resolution

    console.log('==============================================');
    console.log('Backend: Update completed');
    console.log('Matched documents:', updateResult.matchedCount);
    console.log('Modified documents:', updateResult.modifiedCount);
    console.log('==============================================');

    // ✅ ADDITIONAL FIX: Verify the updates by fetching the updated leads
    const updatedLeads = await this.LeadModel.find({
      _id: { $in: dto.leadIds }
    }).exec();

    console.log('Backend: Verification - Updated leads:');
    updatedLeads.forEach(lead => {
      console.log(`  - ${lead.fullName}: assignedTo=${lead.assignedTo}, status=${lead.status}`);
    });

    // ✅ RETURN UPDATED LEADS in response for frontend verification
    return {
      _id: savedAssignment._id,
      leadIds: savedAssignment.leadIds,
      assignedSales: savedAssignment.assignedSales,
      leadCount: savedAssignment.leadCount,
      notes: savedAssignment.notes,
      updatedLeads: updatedLeads, // Include updated leads for verification
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