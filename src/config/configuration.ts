// Groups raw process.env values into typed, namespaced objects (config.get('database.url')
// instead of process.env.DATABASE_URL scattered everywhere). Registered as the ConfigModule
// `load` factory in app.module.ts.
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    // Pooled connection (PgBouncer) — used by the running app for normal query traffic.
    url: process.env.DATABASE_URL,
    // Unpooled direct connection — required by TypeORM migrations, which need a
    // session-level connection (DDL + advisory locks don't work reliably through a pooler).
    directUrl: process.env.DIRECT_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    // Separate secret + longer expiry for refresh tokens — see env.validation.ts
    // for why these aren't shared with the access token's secret/expiry.
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  },
});
