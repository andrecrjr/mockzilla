#!/bin/bash

# Mockzilla Docker Development Helper Script
# This script provides quick commands for common Docker operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if .env exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found!"
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_success ".env file created. Please review and update if needed."
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║     Mockzilla Docker Helper            ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "Development Commands:"
    echo "  1) Start development environment"
    echo "  2) Stop development environment"
    echo "  3) View development logs"
    echo "  4) Rebuild development containers"
    echo "  5) Restart development environment"
    echo "  6) Open Drizzle Studio"
    echo ""
    echo "Database Commands:"
    echo "  7) Open database shell"
    echo "  8) Run migrations"
    echo ""
    echo "Production Commands:"
    echo "  9) Start production environment"
    echo " 10) Stop production environment"
    echo ""
    echo "Utility Commands:"
    echo " 11) Clean all Docker resources"
    echo " 12) Check container status"
    echo "  0) Exit"
    echo ""
}

# Execute command based on choice
execute_command() {
    case $1 in
        1)
            print_info "Starting development environment..."
            check_env
            docker compose -f docker-compose.dev.yaml up -d
            print_success "Development environment started!"
            print_info "Application: http://localhost:36666"
            print_info "Database: localhost:5432"
            ;;
        2)
            print_info "Stopping development environment..."
            docker compose -f docker-compose.dev.yaml down
            print_success "Development environment stopped!"
            ;;
        3)
            print_info "Viewing development logs (Ctrl+C to exit)..."
            docker compose -f docker-compose.dev.yaml logs -f
            ;;
        4)
            print_info "Rebuilding development containers..."
            docker compose -f docker-compose.dev.yaml build --no-cache
            print_success "Development containers rebuilt!"
            ;;
        5)
            print_info "Restarting development environment..."
            docker compose -f docker-compose.dev.yaml restart
            print_success "Development environment restarted!"
            ;;
        6)
            print_info "Starting Drizzle Studio..."
            print_info "Access at: http://localhost:4983"
            docker compose -f docker-compose.dev.yaml --profile tools up drizzle-studio
            ;;
        7)
            print_info "Opening database shell..."
            docker exec -it mockzilla-postgres-dev psql -U mockzilla -d mockzilla
            ;;
        8)
            print_info "Running database migrations..."
            docker exec -it mockzilla-app-dev bun run db:push
            print_success "Migrations completed!"
            ;;
        9)
            print_info "Starting production environment..."
            check_env
            docker compose up -d
            print_success "Production environment started!"
            print_info "Application: http://localhost:36666"
            ;;
        10)
            print_info "Stopping production environment..."
            docker compose down
            print_success "Production environment stopped!"
            ;;
        11)
            print_warning "This will remove all containers, volumes, and cached images!"
            read -p "Are you sure? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Cleaning Docker resources..."
                docker compose -f docker-compose.dev.yaml down -v 2>/dev/null || true
                docker compose down -v 2>/dev/null || true
                docker system prune -f
                print_success "Docker resources cleaned!"
            else
                print_info "Cancelled."
            fi
            ;;
        12)
            print_info "Container status:"
            docker ps -a --filter "name=mockzilla"
            ;;
        0)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option!"
            ;;
    esac
}

# Main loop
main() {
    while true; do
        show_menu
        read -p "Enter your choice: " choice
        execute_command $choice
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main
