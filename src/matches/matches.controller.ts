import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ProjectsService } from '../projects/projects.service';
import { MatchesService } from './matches.service';
import { Match } from './entities/match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { UserFromRequest } from '../common/decorators/user.decorator';

@ApiTags('Matches')
@ApiBearerAuth()
@Controller('projects/:projectId/matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(
    private matchesService: MatchesService,
    private projectsService: ProjectsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new match (manual)' })
  @ApiResponse({ status: 201, type: Match })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createMatchDto: CreateMatchDto,
    @UserFromRequest() user: any,
  ) {
    await this.projectsService.findOne(projectId, user.userId);
    return this.matchesService.create(projectId);
  }

  @Get()
  @ApiOperation({ summary: 'List project matches' })
  @ApiResponse({ status: 200, type: [Match] })
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UserFromRequest() user: any,
  ) {
    return this.matchesService.findAllByProject(projectId, user.userId);
  }

  @Get(':matchId')
  @ApiOperation({ summary: 'Get match details' })
  @ApiResponse({ status: 200, type: Match })
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @UserFromRequest() user: any,
  ) {
    return this.matchesService.findOne(projectId, matchId, user.userId);
  }

  // Add this endpoint to existing controller

  @Get('history')
  @ApiOperation({ summary: 'Get match history' })
  @ApiResponse({ status: 200 })
  async getHistory(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @UserFromRequest() user: any,
  ) {
    return this.matchesService.getMatchHistory(projectId, user.userId, limit);
  }
}
