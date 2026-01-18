import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Match } from './entities/match.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { MatchStatus } from '../common/enums/match-status.enum';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private projectsService: ProjectsService,
  ) {}

  async create(projectId: string): Promise<Match> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const match = this.matchRepository.create({
      projectId,
      status: MatchStatus.WAITING,
      players: [],
    });

    return await this.matchRepository.save(match);
  }

  async findAllByProject(projectId: string, userId: string) {
    await this.projectsService.findOne(projectId, userId);
    return await this.matchRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(projectId: string, matchId: string, userId: string) {
    await this.projectsService.findOne(projectId, userId);

    const match = await this.matchRepository.findOne({
      where: { id: matchId, projectId },
    });

    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async addPlayer(
    matchId: string,
    player: { userId: string; socketId: string },
  ) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    // Check if player already exists
    const existingPlayer = match.players?.find(
      (p) => p.userId === player.userId,
    );
    if (existingPlayer) return match;

    match.players = match.players || [];
    match.players.push({
      ...player,
      joinedAt: new Date().toISOString(),
    });

    // Check if match is full
    const project = await this.projectRepository.findOne({
      where: { id: match.projectId },
    });
    if (match.players.length >= (project?.maxPlayersPerMatch || 4)) {
      match.status = MatchStatus.ACTIVE;
    }

    return await this.matchRepository.save(match);
  }

  async removePlayer(matchId: string, userId: string) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) return;

    match.players = match.players?.filter((p) => p.userId !== userId) || [];

    if (match.players.length === 0) {
      match.status = MatchStatus.FINISHED;
    }

    await this.matchRepository.save(match);
  }

  // Add these methods to existing matches.service.ts

  async endMatch(matchId: string, finalState: any): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    match.status = MatchStatus.FINISHED;
    match.stateSnapshot = finalState;
    match.updatedAt = new Date();

    return await this.matchRepository.save(match);
  }

  async getMatchHistory(projectId: string, userId: string, limit = 50) {
    await this.projectsService.findOne(projectId, userId);
    return await this.matchRepository.find({
      where: {
        projectId,
        status: MatchStatus.FINISHED,
        stateSnapshot: Not(IsNull()),
      },
      select: ['id', 'status', 'createdAt', 'updatedAt', 'stateSnapshot'],
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async findById(matchId: string) {
    return this.matchRepository.findOne({ where: { id: matchId } });
  }
}
