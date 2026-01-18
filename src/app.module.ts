import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule'; // ✅ Added for CleanupModule
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core Modules (dependency order matters)
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MatchesModule } from './matches/matches.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { GameModule } from './game/game.module';
import { RedisModule } from './redis/redis.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    // Global Config (first)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database (second)
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_DATABASE || 'game_server',
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: ['error', 'warn'].includes(process.env.NODE_ENV || 'development'),
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    ProjectsModule,
    MatchesModule,
    MatchmakingModule,
    GameModule,
    RedisModule,
    CleanupModule,
  ],
  
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
