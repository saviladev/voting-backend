import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({
    description: 'The ID of the candidate being voted for.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsString()
  @IsUUID()
  candidateId: string;
}
