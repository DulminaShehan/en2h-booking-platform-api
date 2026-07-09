import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({ email: dto.email, password });

    return this.signToken(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Deliberately identical error whether the email doesn't exist or the password
    // is wrong — a distinct "no such user" message would let an attacker enumerate
    // which emails are registered.
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user);
  }

  private signToken(user: User): TokenResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
