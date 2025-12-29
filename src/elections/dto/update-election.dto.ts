import { PartialType } from '@nestjs/swagger';
import { CreateElectionDto } from './create-election.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateElectionDto extends PartialType(CreateElectionDto) {
    @IsOptional()
    @IsEnum(['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED'])
    status?: string;
}
