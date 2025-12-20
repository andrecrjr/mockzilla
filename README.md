# Mockzilla 🦖

A powerful self-hosted API mocking platform for development and testing. Deploy your own private mock server with an intuitive interface and advanced response generation capabilities.

## 🚀 Quick Start

### Option 1: Fast In-Memory with PGLite (Recommended for Development)

Perfect for quick testing and development. By default, all data is stored in memory and will be lost when the container stops. Use volume persistence to maintain data between restarts.

```bash
# Pull the latest image
docker pull andrecrjr/mockzilla:latest


# run with volume persistence to maintain data between container restarts
docker run -p 36666:36666 \
  -v mockzilla-data:/data \
  andrecrjr/mockzilla:latest
```

> [!TIP]
> This option is ideal for development, testing, and quick experimentation. It starts instantly with no external dependencies. Use volume persistence to keep your mocks between container restarts.

Your mock server will be available at http://localhost:36666

### Option 2: Persistent with External PostgreSQL (Recommended for Production)

For production use or when you need data persistence between container restarts.

```bash
# Pull the latest image
docker pull andrecrjr/mockzilla:latest

# Run with external PostgreSQL database
docker run -p 36666:36666 \
  -e DATABASE_URL=postgresql://username:password@host:5432/database_name \
  andrecrjr/mockzilla:latest
```

> [!NOTE]
> This option is recommended for production environments where data persistence is required. Make sure your PostgreSQL database is accessible from the container.

Your mock server will be available at http://localhost:36666

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
- `docker pull andrecrjr/mockzilla:latest` - Pull latest image
- `docker run -p 36666:36666 andrecrjr/mockzilla:latest` - Run with PGLite (in-memory)
- `docker run -p 36666:36666 -e DATABASE_URL=... andrecrjr/mockzilla:latest` - Run with PostgreSQL

### Running in Background
```bash
docker run -d \
  --name mockzilla \
  -p 36666:36666 \
  andrecrjr/mockzilla:latest
```

### Running with Volume Persistence
```bash
docker run -d \
  --name mockzilla \
  -p 36666:36666 \
  -v mockzilla-data:/data \
  andrecrjr/mockzilla:latest
```

### Development and Contributing
For development purposes, the project includes Makefile commands:
- `make dev-up` - Start development environment with hot-reload
- `make dev-down` - Stop development environment
- `make dev-logs` - View logs
- `make db-studio` - Open Drizzle Studio in Docker
- `make help` - See all available development commands

> [!NOTE]
> Makefile commands are primarily for development and contributing to the project, not for production self-hosting.

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

Mockzilla provides optimized Docker images for reliable self-hosting:

- **Docker Hub Image**: `andrecrjr/mockzilla:latest` - Production-ready image
- **In-Memory Option**: Uses PGLite for fast, ephemeral storage
- **Persistent Option**: Connects to external PostgreSQL for data persistence

### Pulling the Image

Always start by pulling the latest image:

```bash
docker pull andrecrjr/mockzilla:latest
```

### Running with Data Persistence

For production use, connect to an external PostgreSQL database:

```bash
docker run -d \
  --name mockzilla \
  -p 36666:36666 \
  -e DATABASE_URL=postgresql://username:password@host:5432/database_name \
  andrecrjr/mockzilla:latest
```

### Running with Volume Persistence

To persist data without an external database, mount a volume to `/data/`:

```bash
docker run -d \
  --name mockzilla \
  -p 36666:36666 \
  -v mockzilla-data:/data \
  andrecrjr/mockzilla:latest
```

Or mount a local directory:

```bash
docker run -d \
  --name mockzilla \
  -p 36666:36666 \
  -v /path/to/local/data:/data \
  andrecrjr/mockzilla:latest
```

> [!NOTE]
> Using volume persistence at `/data/` will maintain your mocks and configurations between container restarts while still using the in-memory PGLite database.

### Environment Variables

- `DATABASE_URL` (optional): PostgreSQL connection string (when using external database)
- `PORT` (optional): Port to run the server on (default: 36666)

### Data Persistence

- Volume mount: Mount a volume to `/data/` to persist mocks and configurations between container restarts when using PGLite

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

When running with an external PostgreSQL database, configure the `DATABASE_URL` environment variable:

```bash
# PostgreSQL connection string (when using external database)
DATABASE_URL=postgresql://username:password@host:5432/database_name
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
