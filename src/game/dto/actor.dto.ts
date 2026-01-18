import { IsString, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ActorStateDto {
  @ApiProperty({ example: 100 })
  x: number;

  @ApiProperty({ example: 100 })
  y: number;

  @ApiProperty({ example: { health: 100, score: 0 } })
  @IsObject()
  data: Record<string, any>;
}

export class ActorSpawnDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: ActorStateDto })
  @ValidateNested()
  @Type(() => ActorStateDto)
  state: ActorStateDto;
}

export class ActorUpdateDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActorStateDto)
  state?: Partial<ActorStateDto>;
}
