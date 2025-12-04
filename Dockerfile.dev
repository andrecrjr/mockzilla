# Development Dockerfile with hot-reloading support
FROM oven/bun:latest

WORKDIR /app

# Install PostgreSQL client for database operations
USER root
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .
RUN chmod +x ./docker-entrypoint.sh

# Expose the development port
EXPOSE 36666

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=36666
ENV START_CMD="bun dev"


# Run database migrations first, then start the dev server
ENTRYPOINT ["./docker-entrypoint.sh"]
