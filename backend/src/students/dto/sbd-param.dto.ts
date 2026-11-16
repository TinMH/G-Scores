import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class SbdParamDto {
  @ApiProperty({ example: '01000001', description: 'Số báo danh — 8 chữ số' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^\d{8}$/, { message: 'Số báo danh phải gồm đúng 8 chữ số' })
  sbd: string;
}
