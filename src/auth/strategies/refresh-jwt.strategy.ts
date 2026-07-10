import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Separate strategy (name: 'jwt-refresh') from JwtStrategy's 'jwt', registered under
// its own secret (REFRESH_TOKEN_SECRET). Consulted only by RefreshJwtAuthGuard on
// POST /auth/refresh — an access token can't be used here and vice versa.
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
      // Needed to pull the raw token string back out below — AuthService has to
      // bcrypt.compare() the actual token against the stored hash, and the
      // decoded `payload` alone doesn't give us that raw string.
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}
