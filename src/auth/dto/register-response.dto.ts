import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: '6f2b9a1e-3c4d-4b5a-8f7e-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'johndoe@example.com' })
  email: string;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  createdAt: Date;
}
