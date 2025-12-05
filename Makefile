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
	docker compose -f docker-compose.yaml up --remove-orphans

dev-down:
	docker compose -f docker-compose.yaml down --remove-orphans

dev-logs:
	docker compose -f docker-compose.yaml logs -f

dev-build:
	docker compose -f docker-compose.yaml build --no-cache

dev-restart:
	docker compose -f docker-compose.yaml restart

# Start Drizzle Studio
db-studio:
	docker compose -f docker-compose.yaml --profile tools up drizzle-studio --remove-orphans

prod-logs:
	docker compose logs -f

prod-build:
	docker build --no-cache -t mockzilla:latest .

# Utility commands
clean:
	docker compose -f docker-compose.yaml down -v --remove-orphans
	docker compose down -v --remove-orphans

db-shell:
	docker exec -it mockzilla-postgres-dev psql -U mockzilla -d mockzilla
