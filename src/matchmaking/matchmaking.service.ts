import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchesService } from '../matches/matches.service';
import { ProjectsService } from '../projects/projects.service';
import { MatchStatus } from '../common/enums/match-status.enum';
import {
  MatchmakingQueue,
  MatchmakingPlayer,
} from './interfaces/matchmaking.types';

@Injectable()
export class MatchmakingService {
  private queues: Map<string, MatchmakingQueue> = new Map();

  constructor(
    private matchesService: MatchesService,
    private projectsService: ProjectsService,
  ) {}

  async joinQueue(player: MatchmakingPlayer, io: any): Promise<string> {
    const { projectId, userId, socketId } = player;

    // Check if already in queue
    for (const [queueId, queue] of this.queues) {
      if (queue.players.some((p) => p.userId === userId)) {
        return queueId;
      }
    }

    // Get project max players
    const project = await this.projectsService.findOne(projectId, userId);
    const maxPlayers = project.maxPlayersPerMatch;

    // Find or create queue
    let queueId = `${projectId}_queue`;
    let queue = this.queues.get(queueId);

    if (!queue || queue.players.length === 0) {
      // Create new match
      const match = await this.matchesService.create(projectId);
      queue = {
        projectId,
        matchId: match.id,
        players: [],
        maxPlayers,
        createdAt: Date.now(),
      };
      this.queues.set(queueId, queue);
    } else {
      queue = this.queues.get(queueId)!;
    }

    // Add player to queue
    queue.players.push({
      userId,
      socketId,
      joinedAt: Date.now(),
    });

    // Add to match in DB
    await this.matchesService.addPlayer(queue.matchId!, {
      userId,
      socketId,
    });

    // Check if match is ready
    if (queue.players.length >= maxPlayers) {
      await this.finalizeMatch(queueId, io);
    }

    return queueId;
  }

  async leaveQueue(player: MatchmakingPlayer): Promise<void> {
    const { projectId, userId } = player;
    const queueId = `${projectId}_queue`;
    const queue = this.queues.get(queueId);

    if (queue) {
      queue.players = queue.players.filter((p) => p.userId !== userId);

      // Remove from match if exists
      if (queue.matchId) {
        await this.matchesService.removePlayer(queue.matchId, userId);
      }

      // Cleanup empty queue
      if (queue.players.length === 0) {
        this.queues.delete(queueId);
      }
    }
  }

  getQueueStatus(projectId: string): MatchmakingQueue | undefined {
    return this.queues.get(`${projectId}_queue`);
  }
  private async finalizeMatch(queueId: string, io: any) {
    const queue = this.queues.get(queueId);
    if (!queue || queue.players.length < queue.maxPlayers) return;

    // Get GameGateway instance or emit through event
    queue.players.forEach((player) => {
      io.to(player.socketId).emit('match.found', {
        matchId: queue.matchId,
        players: queue.players.map((p) => ({
          userId: p.userId,
          socketId: p.socketId,
        })),
      });
    });
    // For now, just notify (full integration in Phase 5)
    console.log(
      'Match ready!',
      queue.matchId,
      queue.players.map((p) => p.socketId),
    );

    this.queues.delete(queueId);
  }
}
