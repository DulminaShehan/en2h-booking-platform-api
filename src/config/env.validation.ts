import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsNumberString()
  PORT: string = '8080';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DIRECT_URL: string;

  // Neon (and most managed Postgres) requires TLS; a plain local/Docker Postgres
  // container doesn't speak TLS at all, so this has to be toggleable per environment
  // rather than hardcoded — see database.ssl in configuration.ts.
  @IsIn(['true', 'false'])
  DB_SSL: string = 'true';

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '1d';

  // Deliberately a separate secret from JWT_SECRET: a leaked access-token secret
  // shouldn't also let an attacker mint fresh refresh tokens, and vice versa.
  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_EXPIRES_IN: string = '7d';
}

// Runs once at bootstrap via ConfigModule's `validate` hook. Throwing here fails
// startup immediately with a readable error instead of the app crashing later
// on a missing env var the first time it's touched (e.g. mid-request DB connect).
export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment variable validation failed:\n${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
