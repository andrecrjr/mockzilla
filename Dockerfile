FROM oven/bun:latest

WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package.json ./

# Install dependencies
RUN bun install

# Copy application files
COPY . .


EXPOSE 36666

# Use entrypoint script to handle DB setup before starting app
CMD ["bun", "run", "start"]