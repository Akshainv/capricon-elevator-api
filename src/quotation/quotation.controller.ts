// quotation.controller.ts (BACKEND)
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  HttpStatus,
  HttpException,
  Query,
  Headers,
  Req,
} from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto, UpdateQuotationStatusDto } from './dto/update-quotation.dto';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Controller('api/quotation')
export class QuotationController {
  constructor(
    private readonly quotationService: QuotationService,
    private readonly jwtService: JwtService,
  ) { }

  @Post()
  async create(
    @Body() createQuotationDto: CreateQuotationDto,
    @Req() req: Request,
  ) {
    try {
      // Robust Identity Extraction
      let userId: string | undefined;

      // 1. Try req.user (guards)
      const reqUser = (req as any).user;
      if (reqUser) {
        userId = reqUser.sub || reqUser.userId || reqUser._id || reqUser.id;
      }

      // 2. Try Authorization Header
      if (!userId) {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (authHeader && authHeader.toString().startsWith('Bearer ')) {
          try {
            const token = authHeader.toString().split(' ')[1];
            if (token && token !== 'null' && token !== 'undefined') {
              const payload = this.jwtService.decode(token) as any;
              if (payload) {
                userId = payload.sub || payload.userId || payload._id || payload.id;
              }
            }
          } catch (e) {
            console.error('❌ Failed to decode token in QuotationController.create:', e);
          }
        }
      }

      // 3. Fallback Header (deprecated)
      if (!userId) {
        userId = req.headers['x-user-id'] as string;
      }

      console.log('📝 Creating quotation with userId:', userId || 'system');
      const creatorId = userId || 'system';
      const result = await this.quotationService.create(createQuotationDto, creatorId);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Quotation created successfully',
        data: result,
      };
    } catch (error) {
      console.error('❌ Error creating quotation:', error);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      // Robust Identity Extraction
      let userId: string | undefined;
      let userRole: string | undefined;

      // 1. Try req.user (guards)
      const reqUser = (req as any).user;
      if (reqUser) {
        userId = reqUser.sub || reqUser.userId || reqUser._id || reqUser.id;
        userRole = reqUser.role;
      }

      // 2. Try Authorization Header
      if (!userId || !userRole) {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (authHeader && authHeader.toString().startsWith('Bearer ')) {
          try {
            const token = authHeader.toString().split(' ')[1];
            if (token && token !== 'null' && token !== 'undefined') {
              const payload = this.jwtService.decode(token) as any;
              if (payload) {
                userId = userId || payload.sub || payload.userId || payload._id || payload.id;
                userRole = userRole || payload.role;
              }
            }
          } catch (e) {
            console.error('❌ Failed to decode token in QuotationController.findAll:', e);
          }
        }
      }

      // 3. Fallback Headers (deprecated)
      userId = userId || (req.headers['x-user-id'] as string);
      userRole = userRole || (req.headers['x-user-role'] as string);

      console.log('🔍 Fetching quotations for userId:', userId, 'role:', userRole);
      const createdBy = (userRole === 'employee' && userId) ? userId : undefined;
      const result = await this.quotationService.findAll(status, search, createdBy);
      return {
        statusCode: HttpStatus.OK,
        message: 'All quotations fetched successfully',
        data: result,
      };
    } catch (error) {
      console.error('❌ Error fetching quotations:', error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/summary')
  async getStatsSummary() {
    try {
      const result = await this.quotationService.getStatsSummary();
      return {
        statusCode: HttpStatus.OK,
        message: 'Statistics fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.quotationService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Quotation fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Quotation not found', HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    try {
      const result = await this.quotationService.update(id, updateQuotationDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Quotation updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Quotation not found or update failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateQuotationStatusDto,
  ) {
    try {
      const result = await this.quotationService.updateStatus(
        id,
        updateStatusDto.status,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Quotation status updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Quotation not found or status update failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.quotationService.remove(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Quotation deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Quotation not found or delete failed',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  // NEW ENDPOINT: Send quotation with PDF
  @Post(':id/send-pdf')
  async sendQuotationWithPDF(
    @Param('id') id: string,
    @Body() emailData: { email: string; quotationData: any },
  ) {
    try {
      const result = await this.quotationService.sendQuotationWithPDF(
        id,
        emailData.email,
        emailData.quotationData
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Quotation sent successfully with PDF',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send quotation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/convert-to-deal')
  async convertToDeal(@Param('id') id: string) {
    try {
      const result = await this.quotationService.convertToDeal(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Quotation converted to deal successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to convert to deal',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}