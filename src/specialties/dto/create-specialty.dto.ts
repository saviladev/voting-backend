import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class CreateSpecialtyDto {
  @ApiProperty()
  @IsUUID()
  associationId: string;

  @ApiProperty()
  @IsString()
  @Length(2, 200)
  name: string;
}
