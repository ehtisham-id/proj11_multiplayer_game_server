import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../redis/redis.module';
import { GameModule } from '../game/game.module';
import { MatchesModule } from '../matches/matches.module';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule,
    GameModule,
    MatchesModule,
  ],
  providers: [CleanupService],
})
export class CleanupModule {}
