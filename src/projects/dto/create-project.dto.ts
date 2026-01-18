import { IsString, IsNumber, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: 4 })
  @IsNumber()
  @Min(2)
  @IsPositive()
  maxPlayersPerMatch?: number;
}
