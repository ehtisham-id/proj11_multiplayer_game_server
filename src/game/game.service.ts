import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameEngineService } from './game-engine.service';

@Injectable()
export class GameService {
  constructor(
    private jwtService: JwtService,
    private matchmakingService: MatchmakingService,
    private gameEngine: GameEngineService,
  ) {}

  async validateConnection(projectId: string, token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      return { userId: payload.sub, projectId };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async handleJoinQueue(client: any, player: any) {
    const queueId = await this.matchmakingService.joinQueue(player, client);
    return queueId;
  }

  async handleSpawnActor(matchId: string, actorId: string, userId: string, state: any) {
    await this.gameEngine.spawnActor(matchId, actorId, userId, state);
  }

  async handleUpdateActor(matchId: string, actorId: string, userId: string, state: any) {
    await this.gameEngine.updateActor(matchId, actorId, userId, state);
  }
}
