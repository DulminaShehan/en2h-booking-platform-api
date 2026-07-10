import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT bearer token to send as `Authorization: Bearer <token>`',
  })
  accessToken: string;
}
