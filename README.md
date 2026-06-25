<p align="center">
  <img src="public/mockzilla-logo.png" alt="Mockzilla Logo" width="180" />
</p>

<p align="center">
  <a href="https://safeskill.dev/scan/andrecrjr-mockzilla"><img src="https://img.shields.io/badge/SafeSkill-89%2F100_Passes%20with%20Notes-yellow?style=flat-square" alt="SafeSkill Status" /></a>
  <a href="https://hub.docker.com/r/andrecrjr/mockzilla"><img src="https://img.shields.io/docker/pulls/andrecrjr/mockzilla?style=flat-square" alt="Docker Pulls" /></a>
  <a href="https://github.com/andrecrjr/mockzilla/stargazers"><img src="https://img.shields.io/github/stars/andrecrjr/mockzilla?style=flat-square" alt="GitHub Stars" /></a>
  <a href="https://github.com/andrecrjr/mockzilla/blob/main/LICENSE.txt"><img src="https://img.shields.io/github/license/andrecrjr/mockzilla?style=flat-square" alt="License: MIT" /></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-%23000000.svg?style=flat-square&logo=bun&logoColor=white" alt="Bun" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-FFC107?style=flat-square&logo=tauri&logoColor=black" alt="Tauri" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

# Mockzilla

A powerful self-hosted API mocking platform for development and testing. Deploy your own private mock server with an intuitive interface and advanced response generation capabilities.

## Quick Start

### In-Memory with PGLite (Recommended for Development)

Start instantly with ephemeral storage:
```bash
docker run -p 36666:36666 andrecrjr/mockzilla:latest
```

To persist data between container restarts:
```bash
docker run -p 36666:36666 -v mockzilla-data:/data andrecrjr/mockzilla:latest
```

### Persistent with External PostgreSQL (Recommended for Production)

Run with an external database:
```bash
docker run -p 36666:36666 -e DATABASE_URL=postgresql://username:password@host:5432/database_name andrecrjr/mockzilla:latest
```

The mock server and dashboard will be available at http://localhost:36666

## Configuration

The following environment variables can be configured:

- `DATABASE_URL` (optional): PostgreSQL connection string (when using an external database)
- `PORT` (optional): Port to run the server on (default: 36666)

## AI Agent Skills

Integrate Mockzilla's specialized AI experts into your agent workflows:
```bash
npx skills add github.com/andrecrjr/mockzilla
```

Available experts:
- Mock Maker: High-fidelity mocks using JSON Schema and Faker.
- Workflow Architect: Stateful scenarios and business logic.
- Spec Translator: Fast bootstrapping from OpenAPI/technical specifications.
- Logic Doctor: Forensic debugging and state repair.

## Self-Hosting Stack

- Framework: Next.js 16 (App Router)
- Runtime: Bun (JavaScript runtime)
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS 4
- Components: Radix UI
- Desktop: Tauri

## Project Structure

```
mockzilla/
├── app/                  # Next.js app directory (mock server UI)
├── components/           # React components (UI elements)
├── lib/                  # Utility functions and configurations
├── drizzle/              # Database migrations
├── public/               # Static assets
├── Dockerfile            # Production container specification
└── docker-compose.yaml   # Development compose file
```

## Contributing

We welcome contributions to this open-source project. Please make sure you have Docker and Bun installed locally.

### Development Setup

Start the development environment with hot-reloading:
```bash
make dev-up
```

Generate and apply database migrations:
```bash
make db-generate && make db-migrate
```

Open database GUI (Drizzle Studio):
```bash
make db-studio
```

Run checks locally before submitting code:
```bash
bun run lint && bun run typecheck
```

Stop the development environment:
```bash
make dev-down
```

### Contribution Process

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'Add some amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

## License

This project is licensed under the MIT License.
