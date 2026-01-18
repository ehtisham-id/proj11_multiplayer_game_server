import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';
import type { JwtUser } from '../common/interfaces';
import { UserFromRequest } from '../common/decorators/user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, type: Project })
  create(@Body() createProjectDto: CreateProjectDto, @UserFromRequest() user: JwtUser) {
    return this.projectsService.create(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List user projects' })
  @ApiResponse({ status: 200, type: [Project] })
  findAll(@UserFromRequest() user: JwtUser) {
    return this.projectsService.findAll(user.userId);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: 200, type: Project })
  findOne(@Param('projectId', ParseUUIDPipe) projectId: string, @UserFromRequest() user: JwtUser) {
    return this.projectsService.findOne(projectId, user.userId);
  }
}
