import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateAssociationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;
}
