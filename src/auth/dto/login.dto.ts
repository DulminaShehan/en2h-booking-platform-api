import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  // No MinLength here on purpose: a too-short password should fail the bcrypt
  // comparison in AuthService (same "Invalid credentials" as any other mismatch),
  // not get a different DTO-validation error that hints the format rule to an attacker.
  @ApiProperty({ example: 'Str0ngPassword!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
