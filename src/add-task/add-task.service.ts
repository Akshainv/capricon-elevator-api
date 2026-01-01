import { Injectable } from '@nestjs/common';
import { CreateAddTaskDto } from './dto/create-add-task.dto';
import { UpdateAddTaskDto } from './dto/update-add-task.dto';
import { InjectModel } from '@nestjs/mongoose';
import { addTask, addTaskDocument } from './schemas/add-task.schema';
import { Model } from 'mongoose';

@Injectable()
export class AddTaskService {
  constructor(
    @InjectModel(addTask.name) private addTaskModel: Model<addTaskDocument>,
  ) {}

  async create(createAddTaskDto: CreateAddTaskDto) {
    const createAddTask = new this.addTaskModel(createAddTaskDto);
    return createAddTask.save();
  }
  async findAll() {
    const addTasks = await this.addTaskModel.find().exec();
    return addTasks;
  }
  async findOne(id: string) {
    const addTask = await this.addTaskModel.findById(id).exec();
    if (!addTask) {
      throw new Error('AddTask not found');
    }
    return addTask;
  }
  async update(id: string, updateDto: UpdateAddTaskDto) {
    const updatedAddTask = await this.addTaskModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();  
    if (!updatedAddTask) {
      throw new Error('AddTask not found or could not be updated');
    }
    return updatedAddTask;
  }
  async remove(id: string) {
    const deletedAddTask = await this.addTaskModel.findByIdAndDelete(id).exec();
    if (!deletedAddTask) {
      throw new Error('AddTask not found or could not be deleted');
    }
    return { message: 'AddTask successfully deleted' };
  }
}
