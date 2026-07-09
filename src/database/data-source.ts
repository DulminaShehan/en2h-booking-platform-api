import 'dotenv/config';
import { DataSource } from 'typeorm';

// Used exclusively by the TypeORM CLI (migration:generate / migration:run / migration:revert
// scripts in package.json) — never imported by the running app. The CLI runs DDL and takes
// advisory locks, which need a direct, session-level Postgres connection; Neon's pooled
// endpoint (PgBouncer, transaction mode) doesn't support that reliably, hence DIRECT_URL here
// while the app itself connects through DATABASE_URL (see app.module.ts).
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DIRECT_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
