import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id: string;

  @Column()
  @ApiProperty()
  name: string;

  @Column({ default: 4 })
  @ApiProperty()
  maxPlayersPerMatch: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  @ApiProperty()
  user: User;

  @Column()
  userId: string;
}
