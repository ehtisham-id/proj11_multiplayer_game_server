import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { MatchesService } from '../matches/matches.service';

export interface GameState {
  actors: Record<
    string,
    {
      ownerId: string;
      state: {
        x: number;
        y: number;
        data: Record<string, any>;
      };
      updatedAt: number;
    }
  >;
  tick: number;
}

@Injectable()
export class GameEngineService {
  private readonly matchStates: Map<string, GameState> = new Map();

  constructor(
    private readonly redisService: RedisService,
    private readonly matchesService: MatchesService,
  ) {}

  // --------------------------
  // Match State
  // --------------------------
  async getOrCreateMatchState(matchId: string): Promise<GameState> {
    let state = this.matchStates.get(matchId);
    if (state) return state;

    const cached = await this.redisService.get(`match:${matchId}:state`);
    if (cached) {
      state = JSON.parse(cached) as GameState;
      this.matchStates.set(matchId, state);
      return state;
    }

    state = { actors: {}, tick: 0 };
    this.matchStates.set(matchId, state);
    return state;
  }

  async getFullState(matchId: string): Promise<GameState> {
    return await this.getOrCreateMatchState(matchId);
  }

  // --------------------------
  // Actor Management
  // --------------------------
  async spawnActor(
    matchId: string,
    actorId: string,
    ownerId: string,
    state: any,
  ): Promise<void> {
    const gameState = await this.getOrCreateMatchState(matchId);

    if (gameState.actors[actorId]) {
      throw new Error('Actor already exists');
    }

    gameState.actors[actorId] = {
      ownerId,
      state,
      updatedAt: Date.now(),
    };
    gameState.tick++;

    await this.cacheState(matchId, gameState);
  }

  async updateActor(
    matchId: string,
    actorId: string,
    ownerId: string,
    partialState: any,
  ): Promise<void> {
    const gameState = await this.getOrCreateMatchState(matchId);
    const actor = gameState.actors[actorId];

    if (!actor || actor.ownerId !== ownerId) {
      throw new Error('Actor not found or unauthorized');
    }

    actor.state = { ...actor.state, ...partialState };
    actor.updatedAt = Date.now();
    gameState.tick++;

    await this.cacheState(matchId, gameState);
  }

  async removeActor(
    matchId: string,
    actorId: string,
    ownerId: string,
  ): Promise<void> {
    const gameState = await this.getOrCreateMatchState(matchId);
    const actor = gameState.actors[actorId];

    if (!actor || actor.ownerId !== ownerId) {
      throw new Error('Actor not found or unauthorized');
    }

    delete gameState.actors[actorId];
    gameState.tick++;

    await this.cacheState(matchId, gameState);
  }

  // --------------------------
  // State Broadcast / Cache
  // --------------------------
  async broadcastState(matchId: string, clients: string[]): Promise<void> {
    const state = await this.getFullState(matchId);
    // Implement actual socket broadcast in GameGateway
  }

  private async cacheState(matchId: string, state: GameState): Promise<void> {
    await this.redisService.set(
      `match:${matchId}:state`,
      JSON.stringify(state),
      300,
    ); // 5 min TTL
    this.matchStates.set(matchId, state);
  }

  async cleanupMatch(matchId: string): Promise<void> {
    this.matchStates.delete(matchId);
    await this.redisService.del(`match:${matchId}:state`);
  }

  // --------------------------
  // Persistent / Historical State
  // --------------------------
  async persistMatchState(matchId: string): Promise<void> {
    const state = await this.getFullState(matchId);

    // Cache final snapshot in Redis
    await this.redisService.set(
      `match:${matchId}:snapshot`,
      JSON.stringify(state),
    );

    // Persist to DB via MatchesService
    await this.matchesService.endMatch(matchId, state);
  }

  async getHistoricalState(matchId: string): Promise<any> {
    const cached = await this.redisService.get(`match:${matchId}:snapshot`);
    if (cached) return JSON.parse(cached);

    const match = await this.matchesService.findById(matchId);
    return match?.stateSnapshot;
  }
}
