#!/bin/bash

# Ayan.ai Infrastructure Management Script
# Phase 1 Infrastructure Setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🚀 Ayan.ai Infrastructure Management${NC}"
    echo -e "${BLUE}======================================${NC}\n"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        if ! docker compose version > /dev/null 2>&1; then
            print_error "Docker Compose is not available. Please install Docker Compose."
            exit 1
        fi
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
}

# Start infrastructure
start_infrastructure() {
    print_info "Starting Ayan.ai infrastructure..."
    
    cd "$DOCKER_DIR"
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Start core services first
    print_info "Starting core services (PostgreSQL, Redis)..."
    $COMPOSE_CMD up -d ayan-postgres ayan-redis
    
    # Wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready..."
    until $COMPOSE_CMD exec -T ayan-postgres pg_isready -U ayan_user -d ayan_db; do
        print_info "PostgreSQL is unavailable - sleeping..."
        sleep 2
    done
    print_success "PostgreSQL is ready"
    
    # Start storage services
    print_info "Starting storage services (MinIO)..."
    $COMPOSE_CMD up -d ayan-storage
    
    # Wait for MinIO to be ready
    print_info "Waiting for MinIO to be ready..."
    until curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; do
        print_info "MinIO is unavailable - sleeping..."
        sleep 2
    done
    print_success "MinIO is ready"
    
    # Initialize MinIO buckets
    print_info "Initializing MinIO buckets..."
    $COMPOSE_CMD run --rm minio-init
    
    # Start authentication services
    print_info "Starting authentication services (Keycloak)..."
    $COMPOSE_CMD up -d ayan-keycloak
    
    # Start media services
    print_info "Starting media services (LiveKit)..."
    $COMPOSE_CMD up -d ayan-livekit
    
    # Start optional services if profile is specified
    if [[ "$1" == "--with-events" ]]; then
        print_info "Starting event processing services..."
        $COMPOSE_CMD --profile events up -d
    fi
    
    if [[ "$1" == "--with-monitoring" ]]; then
        print_info "Starting monitoring services..."
        $COMPOSE_CMD --profile monitoring up -d
    fi
    
    print_success "Infrastructure started successfully!"
    show_service_urls
}

# Stop infrastructure
stop_infrastructure() {
    print_info "Stopping Ayan.ai infrastructure..."
    
    cd "$DOCKER_DIR"
    $COMPOSE_CMD down
    
    print_success "Infrastructure stopped successfully!"
}

# Restart infrastructure
restart_infrastructure() {
    print_info "Restarting Ayan.ai infrastructure..."
    stop_infrastructure
    sleep 2
    start_infrastructure "$@"
}

# Check service health
health_check() {
    print_info "Checking service health..."
    cd "$DOCKER_DIR"
    
    # Check PostgreSQL
    if $COMPOSE_CMD exec -T ayan-postgres pg_isready -U ayan_user -d ayan_db > /dev/null 2>&1; then
        print_success "PostgreSQL: Healthy"
    else
        print_error "PostgreSQL: Unhealthy"
    fi
    
    # Check Redis
    if $COMPOSE_CMD exec -T ayan-redis redis-cli ping | grep -q PONG; then
        print_success "Redis: Healthy"
    else
        print_error "Redis: Unhealthy"
    fi
    
    # Check MinIO
    if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        print_success "MinIO: Healthy"
    else
        print_error "MinIO: Unhealthy"
    fi
    
    # Check Keycloak  
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "Keycloak: Healthy"
    else
        print_error "Keycloak: Unhealthy"
    fi
    
    # Check LiveKit
    if curl -f http://localhost:7880 > /dev/null 2>&1; then
        print_success "LiveKit: Healthy"
    else
        print_error "LiveKit: Unhealthy"
    fi
}

# Show service URLs and access information
show_service_urls() {
    echo ""
    print_header
    echo -e "${GREEN}🌟 Ayan.ai Infrastructure Services${NC}\n"
    
    echo -e "${BLUE}🔐 Authentication:${NC}"
    echo "   Keycloak Admin: http://localhost:8080"  
    echo "   Username: admin@ayan.nunmai.local"
    echo "   Password: See Keycloak admin console"
    echo ""
    
    echo -e "${BLUE}💾 Storage:${NC}"
    echo "   MinIO Console: http://localhost:9090"
    echo "   MinIO API: http://localhost:9000" 
    echo "   Access Key: ayan_admin_user"
    echo "   Secret Key: ayan_admin_pass_dev"
    echo ""
    
    echo -e "${BLUE}📡 Media:${NC}"
    echo "   LiveKit: http://localhost:7880"
    echo "   LiveKit WebRTC: tcp://localhost:7881"
    echo ""
    
    echo -e "${BLUE}🗄️  Database:${NC}"
    echo "   PostgreSQL: localhost:5432"
    echo "   Database: ayan_db"
    echo "   Username: ayan_user"  
    echo "   Password: ayan_pass_dev"
    echo ""
    
    echo -e "${BLUE}⚡ Cache:${NC}"
    echo "   Redis: localhost:6379"
    echo ""
    
    echo -e "${BLUE}🌐 Applications:${NC}"
    echo "   Admin Web: http://localhost:3000 (when running)"
    echo "   Demo Quiz: http://localhost:3001 (when running)"
    echo ""
    
    echo -e "${YELLOW}💡 Quick Commands:${NC}"
    echo "   Health Check: ./scripts/infrastructure.sh health"
    echo "   View Logs: ./scripts/infrastructure.sh logs [service]"
    echo "   Open Shell: ./scripts/infrastructure.sh shell [service]"
    echo ""
}

# View service logs
show_logs() {
    cd "$DOCKER_DIR"
    
    if [[ -z "$1" ]]; then
        print_info "Showing logs for all services..."
        $COMPOSE_CMD logs -f
    else
        print_info "Showing logs for service: $1"
        $COMPOSE_CMD logs -f "$1"
    fi
}

# Open shell in service container
open_shell() {
    cd "$DOCKER_DIR"
    
    if [[ -z "$1" ]]; then
        print_error "Please specify a service name"
        echo "Available services: ayan-postgres, ayan-redis, ayan-storage, ayan-keycloak, ayan-livekit"
        exit 1
    fi
    
    print_info "Opening shell for service: $1"
    $COMPOSE_CMD exec "$1" /bin/bash
}

# Clean infrastructure (remove containers and volumes)
clean_infrastructure() {
    print_warning "This will remove all containers and volumes. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_info "Cleaning infrastructure..."
        cd "$DOCKER_DIR"
        $COMPOSE_CMD down -v --remove-orphans
        docker system prune -f
        print_success "Infrastructure cleaned successfully!"
    else
        print_info "Clean operation cancelled"
    fi
}

# Main command handler
case "$1" in
    start)
        print_header
        check_docker
        check_docker_compose
        start_infrastructure "${@:2}"
        ;;
    stop)
        print_header
        check_docker
        check_docker_compose
        stop_infrastructure
        ;;
    restart) 
        print_header
        check_docker
        check_docker_compose
        restart_infrastructure "${@:2}"
        ;;
    health)
        print_header
        check_docker
        check_docker_compose
        health_check
        ;;
    urls|info)
        print_header
        show_service_urls
        ;;
    logs)
        check_docker
        check_docker_compose
        show_logs "$2"
        ;;
    shell)
        check_docker
        check_docker_compose  
        open_shell "$2"
        ;;
    clean)
        print_header
        check_docker
        check_docker_compose
        clean_infrastructure
        ;;
    *)
        print_header
        echo "Usage: $0 {start|stop|restart|health|urls|logs|shell|clean}"
        echo ""
        echo "Commands:"
        echo "  start                 - Start all infrastructure services"
        echo "  start --with-events   - Start with event processing services"  
        echo "  start --with-monitoring - Start with monitoring services"
        echo "  stop                  - Stop all services"
        echo "  restart               - Restart all services"
        echo "  health                - Check service health"
        echo "  urls                  - Show service URLs and access info"
        echo "  logs [service]        - View logs (all services or specific)"
        echo "  shell [service]       - Open shell in service container"
        echo "  clean                 - Remove all containers and volumes"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs ayan-postgres"
        echo "  $0 shell ayan-postgres"
        echo "  $0 health"
        exit 1
        ;;
esac