import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { RedisModule } from '../redis/redis.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AuthModule } from '../auth/auth.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [RedisModule, MatchmakingModule, AuthModule, MatchesModule],
  providers: [GameGateway, GameService, GameEngineService],
  exports: [GameEngineService],
})
export class GameModule {}
