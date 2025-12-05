.PHONY: help dev-up dev-down dev-logs dev-build dev-restart prod-up prod-down prod-logs prod-build db-studio clean

# Default target
help:
	@echo "Mockzilla Docker Commands"
	@echo "========================="
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev-up        - Start development environment with hot-reloading"
	@echo "  make dev-down      - Stop development environment"
	@echo "  make dev-logs      - View development logs"
	@echo "  make dev-build     - Rebuild development containers"
	@echo "  make dev-restart   - Restart development environment"
	@echo "  make db-studio     - Start Drizzle Studio for database management"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod-up       - Start production environment"
	@echo "  make prod-down     - Stop production environment"
	@echo "  make prod-logs     - View production logs"
	@echo "  make prod-build    - Rebuild production containers"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean         - Remove all containers, volumes, and images"
	@echo "  make db-shell      - Open PostgreSQL shell"

# Development commands
dev-up:
	docker compose up --remove-orphans

dev-down:
	docker compose down --remove-orphans

dev-logs:
	docker compose logs -f

dev-build:
	docker compose build --no-cache

dev-restart:
	docker compose restart

# Start Drizzle Studio
db-studio:
	docker compose --profile tools up drizzle-studio --remove-orphans

prod-build:
	docker build -f Dockerfile.prd --no-cache -t mockzilla:latest .

# Utility commands
clean:
	docker compose down -v --remove-orphans
	docker rmi mockzilla:latest

db-shell:
	docker exec -it mockzilla-postgres-dev psql -U mockzilla -d mockzilla
