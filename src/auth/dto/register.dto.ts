import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @Length(8, 8)
  dni: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsUUID()
  chapterId: string;
}
