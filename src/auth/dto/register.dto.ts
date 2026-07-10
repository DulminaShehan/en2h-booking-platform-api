import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  // bcrypt silently truncates input past 72 bytes, so anything longer just wastes
  // the user's effort — cap it well under that instead of letting them type it in.
  @ApiProperty({ example: 'Str0ngPassword!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
