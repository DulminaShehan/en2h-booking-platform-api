import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';

// Matches what JwtStrategy#validate / RefreshJwtStrategy#validate put on
// request.user once their respective guards have run.
interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

interface RefreshRequest extends Request {
  user: { userId: string; refreshToken: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: TokenResponseDto })
  register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  // Takes the refresh token as a bearer token (Authorization header), not in the
  // body — RefreshJwtAuthGuard verifies its signature/expiry against
  // REFRESH_TOKEN_SECRET before this handler even runs, the same way JwtAuthGuard
  // does for access tokens elsewhere.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    type: TokenResponseDto,
    description: 'New access + refresh token pair',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token invalid, expired, or revoked',
  })
  refresh(@Req() req: RefreshRequest): Promise<TokenResponseDto> {
    return this.authService.refresh(req.user.userId, req.user.refreshToken);
  }

  // Guarded by the access-token guard (not the refresh one) — logging out is
  // something the currently-signed-in session does, using the token it already has.
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Refresh token revoked' })
  logout(@Req() req: AuthenticatedRequest): Promise<void> {
    return this.authService.logout(req.user.userId);
  }
}
