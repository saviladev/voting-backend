import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @Length(8, 8)
  dni: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
