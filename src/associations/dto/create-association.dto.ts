import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateAssociationDto {
  @ApiProperty()
  @IsString()
  @Length(2, 200)
  name: string;
}
