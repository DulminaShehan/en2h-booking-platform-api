import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 'jwt-refresh' matches the name RefreshJwtStrategy registers under. Apply with
// @UseGuards(RefreshJwtAuthGuard) only on POST /auth/refresh — everywhere else
// uses the access-token JwtAuthGuard instead.
@Injectable()
export class RefreshJwtAuthGuard extends AuthGuard('jwt-refresh') {}
