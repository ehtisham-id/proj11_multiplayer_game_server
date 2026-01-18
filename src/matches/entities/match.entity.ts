import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id: string;

  @Column()
  @ApiProperty()
  projectId: string;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.WAITING })
  @ApiProperty()
  status: MatchStatus;

  @Column('jsonb', { nullable: true })
  @ApiProperty()
  players: Array<{
    userId: string;
    socketId?: string;
    actorId?: string;
    joinedAt: string;
  }>;

  @Column('jsonb', { nullable: true })
  @ApiProperty()
  stateSnapshot: any;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;

  @ManyToOne(() => Project, project => project.id)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
