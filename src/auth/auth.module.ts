import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          // jsonwebtoken's SignOptions type wants `ms`'s branded StringValue
          // (e.g. "1d", "12h") rather than a plain string — cast, since the actual
          // format is only checkable at runtime and is already env-validated as
          // a non-empty string in env.validation.ts.
          expiresIn: configService.getOrThrow<string>(
            'jwt.expiresIn',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  // JwtStrategy/RefreshJwtStrategy must be providers here so Nest instantiates them
  // (which is what registers the 'jwt' and 'jwt-refresh' passport strategies) even
  // though nothing injects them directly. JwtModule above only configures the
  // *default* secret/expiry (used for access tokens); AuthService#issueTokens
  // overrides both per-call when signing the refresh token.
  providers: [AuthService, JwtStrategy, RefreshJwtStrategy],
})
export class AuthModule {}
