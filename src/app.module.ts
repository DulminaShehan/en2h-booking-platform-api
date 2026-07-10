import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { BookingsModule } from './bookings/bookings.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // isGlobal: true means ConfigService is injectable anywhere without re-importing
    // ConfigModule in every feature module.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // Pooled connection: the app makes many short-lived queries per request,
        // which is exactly what a PgBouncer-style pooler (Neon's default endpoint)
        // is for. Migrations use DIRECT_URL instead — see src/database/data-source.ts.
        url: configService.get<string>('database.url'),
        autoLoadEntities: true,
        // Never true outside local experiments: synchronize auto-mutates the schema
        // to match entities, which is unreviewable and unsafe against a shared/prod
        // database. Schema changes go through generated migrations instead.
        synchronize: false,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    AuthModule,
    UsersModule,
    ServicesModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
