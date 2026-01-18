import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchesModule } from '../matches/matches.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [MatchesModule, ProjectsModule],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
