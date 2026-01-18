import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MatchesModule } from './matches/matches.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [AuthModule, ProjectsModule, MatchesModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
