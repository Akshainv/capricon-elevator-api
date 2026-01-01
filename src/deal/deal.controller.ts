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
} from '@nestjs/common';
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('deal')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  async create(@Body() createDealDto: CreateDealDto) {
    try {
      const result = await this.dealService.create(createDealDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Deal created successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('from-quotation')
async createFromQuotation(@Body() body: { quotationData: any; createdBy: string }) {
  console.log('===== FROM-QUOTATION ENDPOINT HIT =====');
  console.log('Full body:', JSON.stringify(body, null, 2));
  console.log('quotationData:', body.quotationData);
  console.log('createdBy:', body.createdBy);
  
  try {
    const result = await this.dealService.createFromQuotation(
      body.quotationData,
      body.createdBy
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Deal created from quotation successfully',
      data: result,
    };
  } catch (error) {
    console.error('===== ERROR IN CONTROLLER =====');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  }
}

  @Get()
  async findAll(@Query('salesExecutive') salesExecutiveId?: string) {
    try {
      let result;
      if (salesExecutiveId) {
        result = await this.dealService.findBySalesExecutive(salesExecutiveId);
      } else {
        result = await this.dealService.findAll();
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'All deals fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get won deals (for admin to convert to projects)
  @Get('won')
  async findWonDeals(@Query('salesExecutive') salesExecutiveId?: string) {
    try {
      let result;
      if (salesExecutiveId) {
        result = await this.dealService.findWonDealsBySalesExecutive(salesExecutiveId);
      } else {
        result = await this.dealService.findWonDeals();
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Won deals fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get unconverted won deals
  @Get('won/unconverted')
  async findUnconvertedWonDeals() {
    try {
      const result = await this.dealService.findUnconvertedWonDeals();
      return {
        statusCode: HttpStatus.OK,
        message: 'Unconverted won deals fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ✅ NEW: Get pending deals (unconverted)
  @Get('pending')
  async findPendingDeals() {
    try {
      const result = await this.dealService.findPendingDeals();
      return {
        statusCode: HttpStatus.OK,
        message: 'Pending deals fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ✅ NEW: Get converted deals
  @Get('converted')
  async findConvertedDeals() {
    try {
      const result = await this.dealService.findConvertedDeals();
      return {
        statusCode: HttpStatus.OK,
        message: 'Converted deals fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get deal statistics
  @Get('statistics')
  async getDealStatistics(@Query('salesExecutive') salesExecutiveId?: string) {
    try {
      const result = await this.dealService.getDealStatistics(salesExecutiveId);
      return {
        statusCode: HttpStatus.OK,
        message: 'Deal statistics fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.dealService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Deal fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Deal not found', HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    try {
      const result = await this.dealService.update(id, updateDealDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Deal updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  // Update deal status (for pipeline drag-and-drop)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; updatedBy: string }
  ) {
    try {
      const result = await this.dealService.updateStatus(
        id,
        body.status,
        body.updatedBy
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Deal status updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Mark deal as converted to project
  @Patch(':id/convert')
  async markAsConverted(
    @Param('id') id: string,
    @Body() body: { projectId: string; convertedBy: string }
  ) {
    try {
      const result = await this.dealService.markAsConverted(
        id,
        body.projectId,
        body.convertedBy
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Deal marked as converted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.dealService.remove(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Deal deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Deal not found', HttpStatus.NOT_FOUND);
    }
  }
}