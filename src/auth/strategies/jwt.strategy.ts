import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Let a token past its `exp` claim fail verification instead of being accepted.
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  // Runs only after passport-jwt has already verified the signature and expiry.
  // Whatever this returns becomes `request.user` in any route behind JwtAuthGuard.
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
