import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    description:
      'Short-lived (15m) JWT to send as `Authorization: Bearer <token>` on protected routes.',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Longer-lived token (see REFRESH_TOKEN_EXPIRES_IN) — send as ' +
      '`Authorization: Bearer <token>` to POST /auth/refresh to get a new access ' +
      'token without logging in again. Rotated (a new one issued) on every use.',
  })
  refreshToken: string;
}
