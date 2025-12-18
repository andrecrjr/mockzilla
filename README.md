# Mockzilla 🦖

A powerful self-hosted API mocking platform for development and testing. Deploy your own private mock server with an intuitive interface and advanced response generation capabilities.

## 🚀 Quick Start

### Option 1: Self-Host with Docker (Recommended)

The fastest way to get your own Mockzilla instance running:

```bash
# Copy environment template
# Update DATABASE_URL to: postgresql://mockzilla:mockzilla@localhost:5432/mockzilla
cp .env.example .env

# Start your mock server
make dev-up

# Or use the Makefile commands
make help
```

Your self-hosted mock server will be available at:
- **Application**: http://localhost:36666
- **Database**: localhost:5432 (internal, not exposed)


### Option 2: Self-Host Without Docker

For more control over your deployment, install directly on your system:

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL to: postgresql://mockzilla:mockzilla@localhost:5432/mockzilla
   ```

3. **Ensure PostgreSQL is running** on your system (you'll need PostgreSQL installed and running locally)

4. **Run database migrations:**
   ```bash
   bun run db:push
   ```

5. **Start the mock server:**
   ```bash
   bun run dev
   ```

Your self-hosted instance will be available at [http://localhost:36666](http://localhost:36666).

## 📦 Available Scripts

### Development
- `bun run dev` - Start development server on port 36666
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

### Database
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio (database UI)

### Docker Commands
- `make dev-up` - Start development environment
- `make dev-down` - Stop development environment
- `make dev-logs` - View logs
- `make db-studio` - Open Drizzle Studio in Docker
- `make help` - See all available commands

## 🛠️ Self-Hosting Stack

Mockzilla is designed for easy self-hosting with the following technologies:

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router (for mock server UI)
- **Runtime**: [Bun](https://bun.sh/) (fast JavaScript runtime)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) (for mock configuration storage)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod
- **Containerization**: Docker (for simplified self-hosting)

## 🐳 Self-Hosting with Docker

Mockzilla provides optimized Docker configurations for reliable self-hosting:

- **Development** (`docker-compose.yaml`): Perfect for setting up your local instance with hot-reloading
- **Production** (`Dockerfile.prd`): Optimized images for deploying your production mock server

Since there's no DOCKER.md file, you can find comprehensive self-hosting documentation in the main README and Docker configuration files.

## 📁 Self-Hosting Structure

```
mockzilla/
├── app/              # Next.js app directory (mock server UI)
├── components/       # React components (UI elements)
├── lib/              # Utility functions and configurations
│   └── db/          # Database schema and connection (for mock storage)
├── drizzle/         # Database migrations (for self-hosted database)
├── public/          # Static assets
├── Dockerfile       # Development Docker configuration (for local self-hosting)
├── Dockerfile.dev   # Development Docker configuration (legacy)
├── Dockerfile.prd   # Production Docker configuration (for production self-hosting)
└── docker-compose.yaml  # Development compose file (for easy self-hosting setup)
```

## 🗄️ Self-Hosted Database Management

### Using Drizzle Studio

Drizzle Studio provides a visual interface for managing your self-hosted database:

### Running Migrations

**With Docker (self-hosting):**
```bash
docker exec -it mockzilla-app-dev bun run db:push
```

**Without Docker (self-hosting):**
```bash
bun run db:push
```

## 🔧 Self-Hosting Configuration

Copy `.env.example` to `.env` and configure for your self-hosted instance:

```bash
# Database (for self-hosted mock storage)
POSTGRES_USER=mockzilla
POSTGRES_PASSWORD=mockzilla
POSTGRES_DB=mockzilla
DATABASE_URL=postgresql://mockzilla:mockzilla@postgres:5432/mockzilla

# Next.js
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Self-Hosting Documentation

For more information about running your own Mockzilla instance:

- [Next.js Documentation](https://nextjs.org/docs) (for understanding the UI)
- [Drizzle ORM Documentation](https://orm.drizzle.team/) (for database management)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) (for UI customization)
- [Docker Documentation](https://docs.docker.com/) (for containerized self-hosting)

## 📄 License

This project is open source under MIT license

---

Deploy your own Mockzilla instance with ❤️ using Next.js and Bun
