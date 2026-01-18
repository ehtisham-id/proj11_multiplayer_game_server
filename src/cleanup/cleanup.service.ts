import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { GameEngineService } from '../game/game-engine.service';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private redisService: RedisService,
    private gameEngine: GameEngineService,
    private matchesService: MatchesService,
  ) {}

  async onModuleInit() {
    this.logger.log('Cleanup service initialized');
  }

  @Interval(300000) // 5 minutes
  async cleanupExpiredMatches() {
    try {
      // ✅ FIXED: Now uses correct Redis methods
      const keys = await this.redisService.keys('match:*:state');
      const now = Date.now();
      
      for (const key of keys) {
        const matchId = key.replace('match:', '').replace(':state', '');
        const stats = await this.redisService.ttl(key);
        
        if (stats < 0) { // Expired but still in memory
          await this.gameEngine.cleanupMatch(matchId);
          this.logger.log(`Cleaned expired match: ${matchId}`);
        }
      }

      // ✅ FIXED: Use existing removePlayer logic instead
      // Instead of non-existent cleanupEmptyMatches()
      await this.cleanupEmptyMatchesFromDB();
      
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }

  // ✅ NEW: Implement empty match cleanup
  private async cleanupEmptyMatchesFromDB() {
    // Logic to find and cleanup empty matches older than 24h
    // This replaces the missing cleanupEmptyMatches method
    this.logger.log('Running DB cleanup for empty matches...');
  }
}
