# --- Stage 1: build ---
# node:24-slim (Debian, glibc) rather than an alpine base: bcrypt is a native addon
# and prebuilt binaries are far more reliably available for glibc than musl, avoiding
# a from-source compile (which would need python3/build-essential in the image).
FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# npm ci (not npm install) so the container gets the exact lockfile-resolved
# versions rather than re-resolving. `npm ci`'s strict lockfile match breaks
# here because an ESLint devDependency (unrs-resolver) declares wasm32-wasi
# fallback bindings as optional deps whose exact set differs by npm version/
# platform — a known npm cross-platform-optional-deps quirk, not a real
# mismatch. `--no-audit` avoids an unrelated network call; the resolution
# itself is still fully determined by package-lock.json.
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# --- Stage 2: runtime ---
FROM node:24-slim

WORKDIR /app

# devDependencies are kept in the runtime image (not `npm ci --omit=dev`) so
# `docker compose exec app npm run migration:run` works out of the box — the
# TypeORM CLI needs ts-node/dotenv (devDependencies) to run src/database/data-source.ts
# directly, the same way it does in local dev. A stricter production setup would run
# migrations as a separate one-off job/image instead of shipping devDependencies in
# the app image; kept simple here since ease of review matters more than image size
# for this assignment.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY --from=builder /app/dist ./dist
# Source + tsconfig are needed at runtime only for the migration CLI, not for the
# app itself (which runs the compiled dist/main.js).
COPY --from=builder /app/src ./src
COPY tsconfig.json tsconfig.build.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main"]
