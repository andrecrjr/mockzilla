# syntax = docker/dockerfile:1

FROM oven/bun:latest AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
FROM base AS deps
COPY package.json ./
COPY .env ./
RUN bun install

# Build the Next.js app (standalone output)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.env ./
COPY . .

ENV NODE_ENV=production
RUN bun run build

# Production runner with standalone output
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=36666

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
RUN mkdir .next && chown nextjs:nodejs .next

# Copy only the necessary runtime assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration files and scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/package.json ./package.json

# Install drizzle-kit for migrations (as root)
USER root
RUN npm install -g drizzle-kit@0.28.1
USER nextjs

EXPOSE 36666

# Run startup script
CMD ["node", "server.js"]