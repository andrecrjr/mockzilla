# syntax = docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build the Next.js app (standalone output)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

# Production runner with Bun on Alpine
FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=36666

# Install PostgreSQL client for migration health checks
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy standalone output as application root
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy node_modules from deps stage (contains drizzle-kit and dependencies)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy migration files and configuration
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Copy migration runner script and entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 36666

# Run migrations on container start, then start the server
ENV START_CMD="bun ./server.js"
ENTRYPOINT ["./docker-entrypoint.sh"]
