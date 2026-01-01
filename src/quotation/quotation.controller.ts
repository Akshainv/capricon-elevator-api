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
} from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto, UpdateQuotationStatusDto } from './dto/update-quotation.dto';

@Controller('api/quotation')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  async create(
    @Body() createQuotationDto: CreateQuotationDto,
    @Headers('x-user-id') userId?: string,
  ) {
    try {
      console.log('📝 Creating quotation with userId:', userId);
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
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    try {
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