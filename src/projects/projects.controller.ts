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
  Req,
} from '@nestjs/common';
import { ProjectService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectProgressDto } from './dto/update-project-progress.dto';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly jwtService: JwtService
  ) { }

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    try {
      const result = await this.projectService.create(createProjectDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Project created successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll(
    @Query('salesExecutive') salesExecutiveId?: string,
    @Query('projectManager') projectManagerId?: string,
    @Query('status') status?: string,
  ) {
    try {
      let result;
      if (salesExecutiveId) {
        result = await this.projectService.findBySalesExecutive(salesExecutiveId);
      } else if (projectManagerId) {
        result = await this.projectService.findByProjectManager(projectManagerId);
      } else if (status) {
        result = await this.projectService.findByStatus(status);
      } else {
        result = await this.projectService.findAll();
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Projects fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get active projects
  @Get('active')
  async findActiveProjects() {
    try {
      const result = await this.projectService.findActiveProjects();
      return {
        statusCode: HttpStatus.OK,
        message: 'Active projects fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get completed projects
  @Get('completed')
  async findCompletedProjects() {
    try {
      const result = await this.projectService.findCompletedProjects();
      return {
        statusCode: HttpStatus.OK,
        message: 'Completed projects fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get projects by milestone
  @Get('milestone/:milestone')
  async findByMilestone(@Param('milestone') milestone: string) {
    try {
      const result = await this.projectService.findByMilestone(milestone);
      return {
        statusCode: HttpStatus.OK,
        message: `Projects in ${milestone} milestone fetched successfully`,
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Get project statistics
  @Get('statistics')
  async getProjectStatistics(
    @Query('salesExecutive') salesExecutiveId?: string,
    @Query('projectManager') projectManagerId?: string,
  ) {
    try {
      const result = await this.projectService.getProjectStatistics(
        salesExecutiveId,
        projectManagerId,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Project statistics fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.projectService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Project fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
  }

  // Get project progress history
  @Get(':id/progress-history')
  async getProgressHistory(@Param('id') id: string) {
    try {
      const result = await this.projectService.getProgressHistory(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Progress history fetched successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    try {
      const result = await this.projectService.update(id, updateProjectDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Project updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body() updateProgressDto: UpdateProjectProgressDto,
    @Req() req: Request,
  ) {
    try {
      // Robust Identity Extraction
      if (!updateProgressDto.updatedBy) {
        const reqUser = (req as any).user;
        if (reqUser) {
          updateProgressDto.updatedBy = reqUser.sub || reqUser.userId || reqUser._id || reqUser.id;
        }

        if (!updateProgressDto.updatedBy) {
          const authHeader = req.headers['authorization'] || req.headers['Authorization'];
          if (authHeader && authHeader.toString().startsWith('Bearer ')) {
            try {
              const token = authHeader.toString().split(' ')[1];
              const payload = this.jwtService.decode(token) as any;
              if (payload) {
                updateProgressDto.updatedBy = payload.sub || payload.userId || payload._id || payload.id;
              }
            } catch (e) { }
          }
        }
      }

      const result = await this.projectService.updateProgress(id, updateProgressDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Project progress updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; updatedBy: string },
    @Req() req: Request,
  ) {
    try {
      // Robust Identity Extraction
      if (!body.updatedBy) {
        const reqUser = (req as any).user;
        if (reqUser) {
          body.updatedBy = reqUser.sub || reqUser.userId || reqUser._id || reqUser.id;
        }

        if (!body.updatedBy) {
          const authHeader = req.headers['authorization'] || req.headers['Authorization'];
          if (authHeader && authHeader.toString().startsWith('Bearer ')) {
            try {
              const token = authHeader.toString().split(' ')[1];
              const payload = this.jwtService.decode(token) as any;
              if (payload) {
                body.updatedBy = payload.sub || payload.userId || payload._id || payload.id;
              }
            } catch (e) { }
          }
        }
      }

      const result = await this.projectService.updateStatus(
        id,
        body.status,
        body.updatedBy,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Project status updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Update financial information
  @Patch(':id/financials')
  async updateFinancials(
    @Param('id') id: string,
    @Body() body: { amountPaid: number; updatedBy: string },
  ) {
    try {
      const result = await this.projectService.updateFinancials(
        id,
        body.amountPaid,
        body.updatedBy,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Financial information updated successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.projectService.remove(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Project deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
  }
}