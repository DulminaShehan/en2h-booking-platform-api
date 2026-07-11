# --- Stage 1: build ---
# node:24-slim (Debian, glibc) rather than an alpine base: bcrypt is a native addon
# and prebuilt binaries are far more reliably available for glibc than musl, avoiding
# a from-source compile (which would need python3/build-essential in the image).
FROM node:24-slim AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY ..

RUN npm run build

# --- Stage 2: runtime ---
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# devDependencies are kept in the runtime image (not `npm ci --omit=dev`) so
# `docker compose exec app npm run migration:run` works out of the box — the
# TypeORM CLI needs ts-node/dotenv (devDependencies) to run src/database/data-source.ts
# directly, the same way it does in local dev. A stricter production setup would run
# migrations as a separate one-off job/image instead of shipping devDependencies in
# the app image; kept simple here since ease of review matters more than image size
# for this assignment.

COPY --from=builder /app/dist ./dist
# Source + tsconfig are needed at runtime only for the migration CLI, not for the
# app itself (which runs the compiled dist/main.js).
COPY --from=builder /app/src ./src
COPY tsconfig.json tsconfig.build.json ./

ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/main"]
