import { Injectable } from '@nestjs/common';
import { CreateLogActivityDto } from './dto/create-log-activity.dto';
import { UpdateLogActivityDto } from './dto/update-log-activity.dto';
import { InjectModel } from '@nestjs/mongoose';
import { logActivityDocument,logActivity } from './schemas/log.activity.schema';
import { Model } from 'mongoose';

@Injectable()
export class LogActivityService {
  constructor(
    @InjectModel(logActivity.name) private logActivityModel: Model<logActivityDocument>,
  ) {}

 async create(createLogActivityDto: CreateLogActivityDto) {
  const createLogActivity = new this.logActivityModel(createLogActivityDto);
  const savedActivity = await createLogActivity.save();
  return savedActivity;
}

  async findAll() {
    const logActivities = await this.logActivityModel.find().exec();
    return logActivities;
  }
  async findOne(id: string) {
    const logActivity = await this.logActivityModel.findById(id).exec();
    if (!logActivity) {
      throw new Error('Log Activity not found');
    }
    return logActivity;
  }
  async update(id: string, updateLogActivityDto: UpdateLogActivityDto) {
    const updatedLogActivity = await this.logActivityModel
      .findByIdAndUpdate(id, updateLogActivityDto, { new: true })
      .exec();
    if (!updatedLogActivity) {
      throw new Error('Log Activity not found or could not be updated');
    }
    return updatedLogActivity;
  }

  async remove(id: string) {
    const deletedLogActivity = await this.logActivityModel.findByIdAndDelete(id).exec();
    if (!deletedLogActivity) {
      throw new Error('Log Activity not found or could not be deleted');
    }
    return ({ message: 'Log Activity successfully deleted'});
  }

  
}
