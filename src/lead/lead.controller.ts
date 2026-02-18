// src/lead/lead.controller.ts (Backend) - FIXED ROUTE ORDER
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dtos';
import { UpdateLeadDto } from './dto/update-lead.dtos';
import { CreateAssignLeadDto } from '../lead/dto/create-assign-lead.dto';

@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) { }

  // ====================== CREATE ======================
  @Post()
  async create(@Body() createLeadDto: CreateLeadDto) {
    try {
      const result = await this.leadService.createLead(createLeadDto);
      return {
        statusCode: HttpStatus.CREATED,
        ...result
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ====================== ASSIGNMENT ROUTES (BEFORE :id) ======================
  @Post('assign')
  async createAssign(@Body() createAssignLeadDto: CreateAssignLeadDto) {
    try {
      const result = await this.leadService.createAssign(createAssignLeadDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Lead assigned successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('assign')
  async findAllAssign() {
    try {
      const result = await this.leadService.findAllAssign();
      return {
        statusCode: HttpStatus.OK,
        message: 'All Lead assign details fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('assign/:id')
  async findOneAssign(@Param('id') id: string) {
    try {
      const result = await this.leadService.findOneAssign(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Lead assign details fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  // ====================== SPECIFIC ROUTES (BEFORE :id) ======================

  @Get('created-by/:userId')
  async getLeadsCreatedBy(@Param('userId') userId: string) {
    try {
      const result = await this.leadService.getLeadsCreatedBy(userId);
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('assigned-to/:userId')
  async getLeadsAssignedToButNotCreatedBy(@Param('userId') userId: string) {
    try {
      const result = await this.leadService.getLeadsAssignedToButNotCreatedBy(userId);
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('unassigned-unconverted')
  async getUnassignedAndUnconvertedLeads() {
    try {
      const result = await this.leadService.getUnassignedAndUnconvertedLeads();
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ====================== GET ALL LEADS ======================
  @Get()
  async findAll() {
    try {
      const result = await this.leadService.getAllLeads();
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ====================== CRITICAL: STATUS UPDATE (BEFORE :id) ======================
  // ✅ THIS MUST COME BEFORE @Get(':id') AND @Put(':id')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    console.log('==============================================');
    console.log('📥 PATCH /lead/:id/status endpoint hit');
    console.log('Lead ID:', id);
    console.log('New Status:', status);
    console.log('==============================================');

    try {
      const result = await this.leadService.updateLeadStatus(id, status);
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      console.error('❌ Status update error:', error.message);
      throw new HttpException(
        error.message || 'Status update failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ====================== GENERIC :id ROUTES (MUST BE LAST) ======================

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.leadService.getLeadById(id);
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    try {
      const result = await this.leadService.updateLead(id, updateLeadDto);
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(
        'Lead not found or update failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.leadService.removeLead(id);
      return {
        statusCode: HttpStatus.OK,
        ...result
      };
    } catch (error) {
      throw new HttpException(
        'Lead not found or delete failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}