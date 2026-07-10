import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

// Cost factor for bcrypt's key-derivation rounds (2^10 iterations). Higher is more
// resistant to brute-forcing a stolen hash but slower per login/register; 10 is
// bcrypt's own recommended floor as of 2024+ hardware.
const BCRYPT_SALT_ROUNDS = 10;

// Refresh tokens are hashed with SHA-256, not bcrypt: bcrypt silently truncates
// its input to 72 bytes, and two JWTs for the same user share an identical
// prefix (header + the start of the payload, since `sub`/`email` precede the
// differentiating `jti`/`iat`/`exp`) — every refresh token for a user would
// therefore bcrypt-hash to the *same* value, making rotation a no-op. SHA-256
// hashes the entire input regardless of length, so distinct tokens always
// produce distinct hashes. bcrypt's deliberate slowness (its whole point for
// passwords) is also unnecessary here: refresh tokens are already
// high-entropy random-looking strings, not guessable human passwords.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Constant-time comparison — a naive `===` leaks how many leading bytes matched
// via response-time differences, which timing attacks can exploit to guess a
// valid hash byte-by-byte. Both digests are fixed-length hex from the same
// hashToken(), so lengths always match and timingSafeEqual won't throw.
function tokenHashMatches(candidateToken: string, storedHash: string): boolean {
  const candidateHash = Buffer.from(hashToken(candidateToken));
  const stored = Buffer.from(storedHash);
  return (
    candidateHash.length === stored.length &&
    timingSafeEqual(candidateHash, stored)
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({ email: dto.email, password });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Deliberately identical error whether the email doesn't exist or the password
    // is wrong — a distinct "no such user" message would let an attacker enumerate
    // which emails are registered.
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  // userId/refreshToken come from RefreshJwtAuthGuard: the guard has already
  // verified the token's signature and expiry against REFRESH_TOKEN_SECRET before
  // this ever runs, so what's left to check here is that it's *this user's
  // current* refresh token — i.e. hasn't been superseded by a later rotation or
  // revoked via logout.
  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<TokenResponseDto> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);

    // Same generic error for "no user", "never logged in" (null hash), and
    // "token doesn't match" — no reason to tell a caller with a validly-signed
    // but stale/revoked token which specific case they hit.
    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    if (!tokenHashMatches(refreshToken, user.hashedRefreshToken)) {
      throw new UnauthorizedException('Access denied');
    }

    // Rotation: issuing a fresh refresh token (and overwriting the stored hash)
    // on every refresh means a copied-and-later-replayed old refresh token stops
    // working the moment the legitimate client refreshes once.
    return this.issueTokens(user);
  }

  // Clears the stored hash so the user's current refresh token (wherever it is)
  // can no longer mint new access tokens. The access token they already hold
  // stays valid until its own short expiry — this is refresh-token revocation,
  // not instant session termination.
  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  private async issueTokens(user: User): Promise<TokenResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    // jwt's `iat` claim only has 1-second resolution, so two tokens signed with an
    // otherwise-identical payload within the same second would be byte-for-byte
    // identical (same header+payload+signature). A random `jti` (JWT ID) per token
    // avoids that collision and is standard practice for auditability anyway.
    const accessToken = this.jwtService.sign({ ...payload, jti: randomUUID() });
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<string>(
          'jwt.refreshExpiresIn',
        ) as StringValue,
      },
    );

    await this.usersService.setRefreshTokenHash(
      user.id,
      hashToken(refreshToken),
    );

    return { accessToken, refreshToken };
  }
}
