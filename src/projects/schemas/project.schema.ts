// src/schemas/project.schema.ts
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class ProjectProgress {
  @Prop({ 
    required: true,
    enum: ['planning', 'site_preparation', 'installation', 'testing', 'handover', 'completed']
  })
  milestone: string;

  @Prop({ required: true, min: 0, max: 100 })
  progressPercentage: number;

  @Prop({ required: true })
  progressNotes: string;

  @Prop()
  issuesEncountered: string;

  @Prop()
  nextSteps: string;

  @Prop({ required: true })
  updatedBy: string;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;

  @Prop({ 
    enum: ['completed', 'in-progress', 'pending'],
    default: 'in-progress'
  })
  milestoneStatus: string;

  @Prop()
  milestoneTitle: string;
}

const ProjectProgressSchema = SchemaFactory.createForClass(ProjectProgress);

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  projectName: string;

  @Prop({ required: true, unique: true })
  projectCode: string;

  @Prop({ required: true })
  clientName: string;

  @Prop({ required: true })
  contactPerson: string;

  @Prop({ required: true })
  contactEmail: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop({ required: true })
  siteAddress: string;

  @Prop({
    required: true,
    enum: [
      'Passenger Elevator',
      'Goods Elevator',
      'Home Lift',
      'Hospital Elevator',
      'Commercial Elevator',
    ],
  })
  elevatorType: string;

  @Prop()
  numberOfFloors: number;

  @Prop()
  quantity: number;

  @Prop({ required: true })
  projectValue: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  expectedCompletionDate: Date;

  @Prop()
  actualCompletionDate: Date;

  @Prop({
    required: true,
    enum: ['not_started', 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'not_started'
  })
  projectStatus: string;

  @Prop({
    required: true,
    enum: ['planning', 'site_preparation', 'installation', 'testing', 'handover', 'completed'],
    default: 'planning'
  })
  currentMilestone: string;

  @Prop({ required: true, default: 0, min: 0, max: 100 })
  progressPercentage: number;

  @Prop({ required: true })
  assignedTo: string;

  @Prop({ required: true })
  projectManager: string;

  @Prop()
  projectDescription: string;

  @Prop()
  technicalSpecifications: string;

  @Prop()
  specialRequirements: string;

  @Prop({ type: [String], default: [] })
  teamMembers: string[];

  // Progress tracking
  @Prop({ type: [ProjectProgressSchema], default: [] })
  progressHistory: ProjectProgress[];

  @Prop()
  lastProgressUpdate: Date;

  @Prop()
  lastProgressNotes: string;

  // Deal reference
  @Prop({ type: Types.ObjectId, ref: 'Deal', required: true })
  dealId: Types.ObjectId;

  @Prop()
  sourceType: string;

  @Prop()
  sourceDealId: string;

  @Prop()
  createdFrom: string;

  // Tracking fields
  @Prop({ required: true })
  createdBy: string;

  @Prop()
  lastUpdatedBy: string;

  // Financial tracking
  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({ default: 0 })
  amountPending: number;

  // Document tracking
  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop({ type: [String], default: [] })
  photos: string[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);