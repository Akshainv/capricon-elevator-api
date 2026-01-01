// projects.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectProgressDto } from './dto/update-project-progress.dto';
import { Project, ProjectDocument } from './schemas/project.schema';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    // Set default values
    const projectData = {
      ...createProjectDto,
      projectStatus: createProjectDto.projectStatus || 'not_started',
      currentMilestone: createProjectDto.currentMilestone || 'planning',
      progressPercentage: createProjectDto.progressPercentage || 0,
      amountPending: createProjectDto.projectValue,
      amountPaid: 0,
      dealId: new Types.ObjectId(createProjectDto.dealId),
      progressHistory: []
    };

    const createProject = new this.projectModel(projectData);
    return createProject.save();
  }

  async findAll() {
    const projects = await this.projectModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return projects;
  }

  // Get projects by sales executive (assignedTo)
  async findBySalesExecutive(salesExecutiveId: string) {
    const projects = await this.projectModel
      .find({ assignedTo: salesExecutiveId })
      .sort({ createdAt: -1 })
      .exec();
    return projects;
  }

  // Get projects by project manager
  async findByProjectManager(projectManagerId: string) {
    const projects = await this.projectModel
      .find({ projectManager: projectManagerId })
      .sort({ createdAt: -1 })
      .exec();
    return projects;
  }

  // Get projects by status
  async findByStatus(status: string) {
    const projects = await this.projectModel
      .find({ projectStatus: status })
      .sort({ createdAt: -1 })
      .exec();
    return projects;
  }

  // Get active projects (not completed or cancelled)
  async findActiveProjects() {
    const projects = await this.projectModel
      .find({ 
        projectStatus: { $nin: ['completed', 'cancelled'] }
      })
      .sort({ createdAt: -1 })
      .exec();
    return projects;
  }

  // Get completed projects
  async findCompletedProjects() {
    const projects = await this.projectModel
      .find({ projectStatus: 'completed' })
      .sort({ actualCompletionDate: -1 })
      .exec();
    return projects;
  }

  // Get projects by milestone
  async findByMilestone(milestone: string) {
    const projects = await this.projectModel
      .find({ 
        currentMilestone: milestone,
        projectStatus: { $nin: ['completed', 'cancelled'] }
      })
      .sort({ createdAt: -1 })
      .exec();
    return projects;
  }

  async findOne(id: string) {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateProjectDto, { new: true })
      .exec();
    
    if (!updatedProject) {
      throw new NotFoundException('Project not found or could not be updated');
    }
    return updatedProject;
  }

  // ✅ FIXED: Update project progress - use completedMilestone from request
  async updateProgress(id: string, updateProgressDto: UpdateProjectProgressDto) {
    console.log('==============================================');
    console.log('📊 BACKEND: Updating project progress');
    console.log('Project ID:', id);
    console.log('Request data:', JSON.stringify(updateProgressDto, null, 2));
    console.log('==============================================');

    const project = await this.projectModel.findById(id).exec();
    
    if (!project) {
      console.error('❌ Project not found');
      throw new NotFoundException('Project not found');
    }

    console.log('Current project state BEFORE update:');
    console.log('  - currentMilestone:', project.currentMilestone);
    console.log('  - progressPercentage:', project.progressPercentage);
    console.log('  - projectStatus:', project.projectStatus);
    console.log('  - progressHistory length:', project.progressHistory?.length || 0);

    if (project.projectStatus === 'completed' || project.projectStatus === 'cancelled') {
      console.error('❌ Cannot update completed/cancelled project');
      throw new BadRequestException('Cannot update progress for completed or cancelled projects');
    }

    // Auto-update project status based on milestone and progress
    let newStatus = project.projectStatus;
    if (updateProgressDto.currentMilestone === 'completed' || updateProgressDto.progressPercentage === 100) {
      newStatus = 'completed';
      console.log('✅ Setting status to completed (100% progress or final milestone)');
    } else if (updateProgressDto.progressPercentage > 0 && project.projectStatus === 'not_started') {
      newStatus = 'in_progress';
      console.log('✅ Setting status to in_progress (project started)');
    } else if (updateProgressDto.progressPercentage > 0) {
      newStatus = 'in_progress';
    }

    // ✅ CRITICAL FIX: Use completedMilestone from request (the milestone user just clicked)
    const justCompletedMilestone = updateProgressDto.completedMilestone || project.currentMilestone;
    const nextMilestone = updateProgressDto.currentMilestone;
    
    console.log('Milestone transition logic:');
    console.log('  - Milestone being completed NOW:', justCompletedMilestone);
    console.log('  - Next milestone to work on:', nextMilestone);

    // ✅ Create detailed progress entry marking the milestone that was JUST completed
    const progressEntry = {
      milestone: justCompletedMilestone, // ✅ Use the milestone from request
      progressPercentage: updateProgressDto.progressPercentage,
      progressNotes: updateProgressDto.progressNotes || `${justCompletedMilestone} completed`,
      issuesEncountered: updateProgressDto.issuesEncountered || '',
      nextSteps: updateProgressDto.nextSteps || '',
      updatedBy: updateProgressDto.updatedBy,
      updatedAt: new Date(),
      milestoneStatus: 'completed', // ✅ Mark as completed
      milestoneTitle: updateProgressDto.milestoneTitle || justCompletedMilestone
    };

    console.log('Progress entry to be saved in history:', JSON.stringify(progressEntry, null, 2));

    const updateData: any = {
      currentMilestone: nextMilestone, // ✅ Update currentMilestone to the NEXT one
      progressPercentage: updateProgressDto.progressPercentage,
      projectStatus: newStatus,
      lastProgressUpdate: new Date(),
      lastProgressNotes: updateProgressDto.progressNotes || '',
      lastUpdatedBy: updateProgressDto.updatedBy,
      $push: { progressHistory: progressEntry }
    };

    // Set actual completion date if completed
    if (newStatus === 'completed') {
      updateData.actualCompletionDate = new Date();
      console.log('✅ Setting actual completion date');
    }

    console.log('Update data to be applied to database:');
    console.log('  - New currentMilestone:', updateData.currentMilestone);
    console.log('  - New progressPercentage:', updateData.progressPercentage);
    console.log('  - New projectStatus:', updateData.projectStatus);
    console.log('  - Adding to progressHistory:', progressEntry.milestone, '(completed)');

    try {
      const updatedProject = await this.projectModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      console.log('==============================================');
      console.log('✅ BACKEND: Project updated successfully in database');
      console.log('Updated project state AFTER update:');
      console.log('  - currentMilestone:', updatedProject?.currentMilestone);
      console.log('  - progressPercentage:', updatedProject?.progressPercentage);
      console.log('  - projectStatus:', updatedProject?.projectStatus);
      console.log('  - progressHistory length:', updatedProject?.progressHistory?.length || 0);
      
      if (updatedProject?.progressHistory && updatedProject.progressHistory.length > 0) {
        console.log('All completed milestones in progressHistory:');
        updatedProject.progressHistory.forEach((entry: any, index: number) => {
          console.log(`  ${index + 1}. Milestone: ${entry.milestone} | Status: ${entry.milestoneStatus} | Date: ${new Date(entry.updatedAt).toLocaleString()}`);
        });
      }
      console.log('==============================================');

      return updatedProject;
    } catch (error) {
      console.error('==============================================');
      console.error('❌ BACKEND: Error updating project in database');
      console.error('Error details:', error);
      console.error('==============================================');
      throw error;
    }
  }

  // Update project status manually
  async updateStatus(id: string, newStatus: string, updatedBy: string) {
    console.log('==============================================');
    console.log('🔄 BACKEND: Updating project status manually');
    console.log('Project ID:', id);
    console.log('New status:', newStatus);
    console.log('Updated by:', updatedBy);
    console.log('==============================================');

    const project = await this.projectModel.findById(id).exec();
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updateData: any = {
      projectStatus: newStatus,
      lastUpdatedBy: updatedBy,
      lastProgressUpdate: new Date()
    };

    if (newStatus === 'completed') {
      updateData.actualCompletionDate = new Date();
      updateData.progressPercentage = 100;
      updateData.currentMilestone = 'completed';
      console.log('✅ Setting project to completed state');
    }

    // ✅ Add to progress history
    const progressEntry = {
      milestone: project.currentMilestone,
      progressPercentage: newStatus === 'completed' ? 100 : project.progressPercentage,
      progressNotes: `Project status changed to ${newStatus}`,
      issuesEncountered: '',
      nextSteps: '',
      updatedBy: updatedBy,
      updatedAt: new Date(),
      milestoneStatus: newStatus === 'completed' ? 'completed' : 'in-progress',
      milestoneTitle: 'Status Update'
    };

    updateData.$push = { progressHistory: progressEntry };

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    console.log('✅ Status updated successfully');
    console.log('New project status:', updatedProject?.projectStatus);
    console.log('==============================================');

    return updatedProject;
  }

  // Update financial information
  async updateFinancials(id: string, amountPaid: number, updatedBy: string) {
    console.log('==============================================');
    console.log('💰 BACKEND: Updating project financials');
    console.log('Project ID:', id);
    console.log('Amount paid:', amountPaid);
    console.log('Updated by:', updatedBy);
    console.log('==============================================');

    const project = await this.projectModel.findById(id).exec();
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalPaid = project.amountPaid + amountPaid;
    const pending = project.projectValue - totalPaid;

    console.log('Financial calculation:');
    console.log('  - Previous amount paid:', project.amountPaid);
    console.log('  - New payment:', amountPaid);
    console.log('  - Total amount paid:', totalPaid);
    console.log('  - Amount pending:', pending);

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          amountPaid: totalPaid,
          amountPending: pending,
          lastUpdatedBy: updatedBy
        },
        { new: true }
      )
      .exec();

    console.log('✅ Financials updated successfully');
    console.log('==============================================');

    return updatedProject;
  }

  async remove(id: string) {
    console.log('==============================================');
    console.log('🗑️ BACKEND: Deleting project');
    console.log('Project ID:', id);
    console.log('==============================================');

    const deletedProject = await this.projectModel.findByIdAndDelete(id).exec();
    if (!deletedProject) {
      throw new NotFoundException('Project not found or could not be deleted');
    }

    console.log('✅ Project deleted successfully');
    console.log('Deleted project:', deletedProject.projectName);
    console.log('==============================================');

    return { message: 'Project successfully deleted' };
  }

  // Analytics endpoints
  async getProjectStatistics(salesExecutiveId?: string, projectManagerId?: string) {
    console.log('==============================================');
    console.log('📊 BACKEND: Getting project statistics');
    if (salesExecutiveId) {
      console.log('Filtering by Sales Executive ID:', salesExecutiveId);
    }
    if (projectManagerId) {
      console.log('Filtering by Project Manager ID:', projectManagerId);
    }
    console.log('==============================================');

    let query: any = {};
    
    if (salesExecutiveId) {
      query.assignedTo = salesExecutiveId;
    } else if (projectManagerId) {
      query.projectManager = projectManagerId;
    }
    
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      cancelledProjects
    ] = await Promise.all([
      this.projectModel.countDocuments(query).exec(),
      this.projectModel.countDocuments({ 
        ...query, 
        projectStatus: { $nin: ['completed', 'cancelled'] }
      }).exec(),
      this.projectModel.countDocuments({ ...query, projectStatus: 'completed' }).exec(),
      this.projectModel.countDocuments({ ...query, projectStatus: 'on_hold' }).exec(),
      this.projectModel.countDocuments({ ...query, projectStatus: 'cancelled' }).exec(),
    ]);

    const projects = await this.projectModel.find(query).exec();
    
    const totalValue = projects.reduce((sum, project) => sum + project.projectValue, 0);
    const completedValue = projects
      .filter(p => p.projectStatus === 'completed')
      .reduce((sum, project) => sum + project.projectValue, 0);
    const activeValue = projects
      .filter(p => p.projectStatus !== 'completed' && p.projectStatus !== 'cancelled')
      .reduce((sum, project) => sum + project.projectValue, 0);
    const totalAmountPaid = projects.reduce((sum, project) => sum + (project.amountPaid || 0), 0);
    const totalAmountPending = projects.reduce((sum, project) => sum + (project.amountPending || 0), 0);

    const completionRate = totalProjects > 0 
      ? Math.round((completedProjects / totalProjects) * 100) 
      : 0;

    // Calculate average progress
    const avgProgress = activeProjects > 0
      ? Math.round(
          projects
            .filter(p => p.projectStatus !== 'completed' && p.projectStatus !== 'cancelled')
            .reduce((sum, p) => sum + p.progressPercentage, 0) / activeProjects
        )
      : 0;

    // Milestone breakdown
    const milestoneBreakdown = {
      planning: await this.projectModel.countDocuments({ ...query, currentMilestone: 'planning' }).exec(),
      site_preparation: await this.projectModel.countDocuments({ ...query, currentMilestone: 'site_preparation' }).exec(),
      installation: await this.projectModel.countDocuments({ ...query, currentMilestone: 'installation' }).exec(),
      testing: await this.projectModel.countDocuments({ ...query, currentMilestone: 'testing' }).exec(),
      handover: await this.projectModel.countDocuments({ ...query, currentMilestone: 'handover' }).exec(),
      completed: await this.projectModel.countDocuments({ ...query, currentMilestone: 'completed' }).exec(),
    };

    const statistics = {
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      cancelledProjects,
      totalValue,
      completedValue,
      activeValue,
      totalAmountPaid,
      totalAmountPending,
      completionRate,
      avgProgress,
      milestoneBreakdown
    };

    console.log('✅ Statistics calculated successfully');
    console.log('Statistics summary:', {
      totalProjects,
      activeProjects,
      completedProjects,
      completionRate: completionRate + '%',
      avgProgress: avgProgress + '%'
    });
    console.log('==============================================');

    return statistics;
  }

  // Get project progress history with detailed information
  async getProgressHistory(id: string) {
    console.log('==============================================');
    console.log('📜 BACKEND: Fetching progress history');
    console.log('Project ID:', id);
    console.log('==============================================');

    const project = await this.projectModel.findById(id).exec();
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const history = project.progressHistory.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    console.log('✅ Progress history entries found:', history.length);
    if (history.length > 0) {
      console.log('Progress history details:');
      history.forEach((entry, index) => {
        console.log(`  ${index + 1}. Milestone: ${entry.milestone} | Status: ${entry.milestoneStatus} | Date: ${new Date(entry.updatedAt).toLocaleString()}`);
      });
    }
    console.log('==============================================');

    return history;
  }
}