import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 'jwt' matches the name PassportStrategy(Strategy) registers JwtStrategy under.
// Apply with @UseGuards(JwtAuthGuard) on any route/controller that requires a
// valid bearer token — e.g. bookings endpoints once they exist.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
