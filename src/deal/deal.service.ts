import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { InjectModel } from '@nestjs/mongoose';
import { dealDocument, deal } from './schemas/deal.schema';
import { Employee, EmployeeDocument } from '../employee/schemas/employeeSchema';
import { Model } from 'mongoose';

@Injectable()
export class DealService {
  constructor(
    @InjectModel(deal.name) private dealModel: Model<dealDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) { }

  // ✅ UPDATED: Helper method to enrich deal with employee name for display
  private async enrichDealWithEmployeeName(deal: any) {
    if (deal.assignedTo && typeof deal.assignedTo === 'string' && deal.assignedTo.length === 24) {
      try {
        const employee = await this.employeeModel.findById(deal.assignedTo).exec();
        if (employee) {
          deal.assignedToName = employee.fullName;
        }
      } catch (error) {
        console.warn('Could not fetch employee for deal:', error);
      }
    }
    return deal;
  }

  async create(createDealDto: CreateDealDto) {
    // Set default values
    const dealData = {
      ...createDealDto,
      DealStatus: createDealDto.DealStatus || 'lead',
      Probability: createDealDto.Probability || 25,
      converted: false
    };

    const createDeal = new this.dealModel(dealData);
    return createDeal.save();
  }

  // ✅ FIXED: Store employee ID in assignedTo field, with better employee lookup
  async createFromQuotation(quotationData: any, createdBy: string) {
    console.log('Creating deal from quotation:', quotationData);
    console.log('Created by user ID:', createdBy);

    // Validate required fields
    if (!quotationData.customerName) {
      throw new BadRequestException('Customer name is required');
    }
    if (!createdBy) {
      throw new BadRequestException('Created by user ID is required');
    }

    // ✅ FIX: Try multiple ways to find the employee
    let employee: any = null;

    try {
      // First, try to find by MongoDB _id
      employee = await this.employeeModel.findById(createdBy).exec();

      // If not found, try to find by user reference field
      if (!employee) {
        console.log('Employee not found by _id, trying user field...');
        employee = await this.employeeModel.findOne({ user: createdBy }).exec();
      }

      // If still not found, try userId field
      if (!employee) {
        console.log('Employee not found by user field, trying userId field...');
        employee = await this.employeeModel.findOne({ userId: createdBy }).exec();
      }

      // If still not found, get the first employee as fallback (for demo purposes)
      if (!employee) {
        console.warn('No employee found for user ID:', createdBy);
        console.log('Using first available employee as fallback...');
        employee = await this.employeeModel.findOne().exec();

        if (!employee) {
          throw new BadRequestException('No employees found in the system. Please create an employee first.');
        }
      }

      console.log('Found employee:', employee.fullName, 'with ID:', employee._id);
    } catch (error) {
      console.error('Error finding employee:', error);
      throw new BadRequestException(`Could not find employee: ${error.message}`);
    }

    // Map elevator type to match schema enum values
    const elevatorTypeMap: { [key: string]: string } = {
      'goods': 'Goods Elevator',
      'Goods': 'Goods Elevator',
      'goods elevator': 'Goods Elevator',
      'Goods Elevator': 'Goods Elevator',
      'passenger': 'Passenger Elevator',
      'Passenger': 'Passenger Elevator',
      'passenger elevator': 'Passenger Elevator',
      'Passenger Elevator': 'Passenger Elevator',
      'home': 'Home Lift',
      'Home': 'Home Lift',
      'home lift': 'Home Lift',
      'Home Lift': 'Home Lift',
      'hospital': 'Hospital Elevator',
      'Hospital': 'Hospital Elevator',
      'hospital elevator': 'Hospital Elevator',
      'Hospital Elevator': 'Hospital Elevator',
      'commercial': 'Commercial Elevator',
      'Commercial': 'Commercial Elevator',
      'commercial elevator': 'Commercial Elevator',
      'Commercial Elevator': 'Commercial Elevator'
    };

    const elevationType = quotationData.elevationType || 'home';
    const mappedElevatorType = elevatorTypeMap[elevationType] || 'Home Lift';

    // ✅ CRITICAL FIX: Use the found employee's _id for assignedTo
    const dealData = {
      dealTitle: quotationData.customerName || 'Untitled Deal',
      companyName: quotationData.customerCompany || quotationData.companyName || 'N/A',
      contactPerson: quotationData.customerName || 'N/A',
      email: quotationData.customerEmail || 'contact@example.com',
      phone: quotationData.customerPhone || '+91 0000000000',
      dealAmount: Number(quotationData.totalAmount || quotationData.totalCost || 0),
      dealDetails: mappedElevatorType,
      NumberOFloors: 0,
      quantity: 1,
      DealStatus: 'pending',
      Probability: 80,
      expectedClosingDate: new Date(),
      assignedTo: employee._id.toString(), // ✅ Use the found employee's _id
      leadSource: 'quotation',
      address: quotationData.customerAddress || '',
      requirementNotes: quotationData.termsAndConditions || '',
      internalNotes: quotationData.notes || quotationData.specialRequirements || '',
      converted: false,
      quoteNumber: quotationData.quoteNumber || '',
      quotationId: quotationData._id || quotationData.id || '',
      createdFrom: 'quotation',
      createdBy: createdBy // Keep original user ID for audit
    };

    console.log('Mapped deal data:', dealData);

    try {
      const createDeal = new this.dealModel(dealData);
      const savedDeal = await createDeal.save();
      console.log('Deal saved successfully:', savedDeal);

      // ✅ Enrich with employee name for response
      return this.enrichDealWithEmployeeName(savedDeal.toObject());
    } catch (error) {
      console.error('Error saving deal:', error);
      throw new BadRequestException(`Failed to create deal: ${error.message}`);
    }
  }

  // ✅ UPDATED: Enrich all deals with employee names
  async findAll() {
    const deals = await this.dealModel.find().sort({ createdAt: -1 }).exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // Get deals by sales executive (assignedTo)
  async findBySalesExecutive(salesExecutiveId: string) {
    const deals = await this.dealModel
      .find({ assignedTo: salesExecutiveId })
      .sort({ createdAt: -1 })
      .exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // Get only won deals
  async findWonDeals() {
    const deals = await this.dealModel
      .find({ DealStatus: 'won' })
      .sort({ createdAt: -1 })
      .exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // Get won deals by sales executive
  async findWonDealsBySalesExecutive(salesExecutiveId: string) {
    const deals = await this.dealModel
      .find({
        assignedTo: salesExecutiveId,
        DealStatus: 'won'
      })
      .sort({ createdAt: -1 })
      .exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // Get deals that haven't been converted to projects
  async findUnconvertedWonDeals() {
    const deals = await this.dealModel
      .find({
        DealStatus: 'won',
        converted: false
      })
      .sort({ createdAt: -1 })
      .exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // Get pending deals (unconverted)
  async findPendingDeals() {
    const deals = await this.dealModel
      .find({
        converted: false
      })
      .sort({ createdAt: -1 })
      .exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // Get converted deals
  async findConvertedDeals() {
    const deals = await this.dealModel
      .find({
        converted: true
      })
      .sort({ createdAt: -1 })
      .exec();

    // Enrich deals with employee names
    const enrichedDeals = await Promise.all(
      deals.map(deal => this.enrichDealWithEmployeeName(deal.toObject()))
    );

    return enrichedDeals;
  }

  // ✅ UPDATED: Enrich single deal with employee name
  async findOne(id: string) {
    const deal = await this.dealModel.findById(id).exec();
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return this.enrichDealWithEmployeeName(deal.toObject());
  }

  async update(id: string, updateDealDto: UpdateDealDto) {
    // Auto-update probability based on status
    if (updateDealDto.DealStatus) {
      if (updateDealDto.DealStatus === 'won') {
        updateDealDto.Probability = 100;
      } else if (updateDealDto.DealStatus === 'lost') {
        updateDealDto.Probability = 0;
      }
    }

    const updatedDeal = await this.dealModel
      .findByIdAndUpdate(id, updateDealDto, { new: true })
      .exec();

    if (!updatedDeal) {
      throw new NotFoundException('Deal not found or could not be updated');
    }
    return updatedDeal;
  }

  // Mark deal as converted to project
  async markAsConverted(id: string, projectId: string, convertedBy: string) {
    const deal = await this.dealModel.findById(id).exec();

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (deal.converted) {
      throw new BadRequestException('This deal has already been converted to a project');
    }

    const updatedDeal = await this.dealModel
      .findByIdAndUpdate(
        id,
        {
          converted: true,
          convertedProjectId: projectId,
          convertedDate: new Date(),
          convertedBy: convertedBy,
          DealStatus: 'won' // Auto-mark as won when converted
        },
        { new: true }
      )
      .exec();

    return updatedDeal;
  }

  // Update deal status (for drag-and-drop in pipeline)
  async updateStatus(id: string, newStatus: string, updatedBy: string) {
    let probability: number | undefined = undefined;

    // Auto-set probability based on status
    if (newStatus === 'won') {
      probability = 100;
    } else if (newStatus === 'lost') {
      probability = 0;
    }

    const updateData: any = {
      DealStatus: newStatus,
      lastUpdatedBy: updatedBy
    };

    if (probability !== undefined) {
      updateData.Probability = probability;
    }

    const updatedDeal = await this.dealModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedDeal) {
      throw new NotFoundException('Deal not found');
    }

    return updatedDeal;
  }

  async remove(id: string) {
    const deletedDeal = await this.dealModel.findByIdAndDelete(id).exec();
    if (!deletedDeal) {
      throw new NotFoundException('Deal not found or could not be deleted');
    }
    return { message: 'Deal successfully deleted' };
  }

  // Analytics endpoints
  async getDealStatistics(salesExecutiveId?: string) {
    const query = salesExecutiveId ? { assignedTo: salesExecutiveId } : {};

    const [totalDeals, wonDeals, lostDeals, activeDeals] = await Promise.all([
      this.dealModel.countDocuments(query).exec(),
      this.dealModel.countDocuments({ ...query, DealStatus: 'won' }).exec(),
      this.dealModel.countDocuments({ ...query, DealStatus: 'lost' }).exec(),
      this.dealModel.countDocuments({
        ...query,
        DealStatus: { $nin: ['won', 'lost'] }
      }).exec(),
    ]);

    const deals = await this.dealModel.find(query).exec();

    const totalValue = deals.reduce((sum, deal) => sum + deal.dealAmount, 0);
    const wonValue = deals
      .filter(d => d.DealStatus === 'won')
      .reduce((sum, deal) => sum + deal.dealAmount, 0);
    const pipelineValue = deals
      .filter(d => d.DealStatus !== 'won' && d.DealStatus !== 'lost')
      .reduce((sum, deal) => sum + deal.dealAmount, 0);

    const winRate = (wonDeals + lostDeals) > 0
      ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100)
      : 0;

    return {
      totalDeals,
      wonDeals,
      lostDeals,
      activeDeals,
      totalValue,
      wonValue,
      pipelineValue,
      winRate
    };
  }
}