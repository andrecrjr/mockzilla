# Mockzilla 🦖

A powerful Next.js application with PostgreSQL database, built with modern web technologies.

## 🚀 Quick Start

### Option 1: Docker (Recommended for Local Development)

The fastest way to get started with hot-reloading and automatic database setup:

```bash
# Copy environment template
cp .env.example .env

# Start development environment
make dev-up

# Or use the interactive helper
./docker-helper.sh
```

Your application will be available at:
- **Application**: http://localhost:36666
- **Database**: localhost:5432

📖 **For detailed Docker documentation, see [DOCKER.md](./DOCKER.md)**

### Option 2: Local Development (Without Docker)

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL to: postgresql://mockzilla:mockzilla@localhost:5432/mockzilla
   ```

3. **Start PostgreSQL** (you'll need PostgreSQL running locally)

4. **Run database migrations:**
   ```bash
   bun run db:push
   ```

5. **Start the development server:**
   ```bash
   bun run dev
   ```

Open [http://localhost:36666](http://localhost:36666) with your browser to see the result.

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

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Runtime**: [Bun](https://bun.sh/)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod
- **Deployment**: Docker

## 🐳 Docker Setup

This project includes optimized Docker configurations for both development and production:

- **Development** (`docker-compose.dev.yaml`): Hot-reloading, volume mounting, Drizzle Studio
- **Production** (`docker-compose.yaml`): Optimized builds, standalone output, minimal runtime

See [DOCKER.md](./DOCKER.md) for comprehensive Docker documentation.

## 📁 Project Structure

```
mockzilla/
├── app/              # Next.js app directory (routes, layouts)
├── components/       # React components
├── lib/              # Utility functions and configurations
│   └── db/          # Database schema and connection
├── drizzle/         # Database migrations
├── public/          # Static assets
├── Dockerfile       # Production Docker configuration
├── Dockerfile.dev   # Development Docker configuration
└── docker-compose.yaml  # Production compose file
```

## 🗄️ Database Management

### Using Drizzle Studio

Drizzle Studio provides a visual interface for your database:

**With Docker:**
```bash
make db-studio
# Open http://localhost:4983
```

**Without Docker:**
```bash
bun run db:studio
```

### Running Migrations

**With Docker:**
```bash
docker exec -it mockzilla-app-dev bun run db:push
```

**Without Docker:**
```bash
bun run db:push
```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
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

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives/overview/introduction)

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using Next.js and Bun
