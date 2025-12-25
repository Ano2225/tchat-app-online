#!/bin/bash

# BabiChat - Script de démarrage
# Usage: ./start.sh [dev|prod|stop|restart|logs]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║         🚀 BabiChat Launcher          ║"
    echo "╔════════════════════════════════════════╗"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    print_success "Docker et Docker Compose sont installés"
}

check_env() {
    if [ ! -f .env ]; then
        print_warning "Fichier .env non trouvé"
        print_info "Copie de .env.example vers .env..."
        cp .env.example .env
        print_warning "⚠️  IMPORTANT: Éditez le fichier .env avec vos valeurs avant de continuer!"
        print_info "Commande: nano .env"
        exit 1
    fi
    print_success "Fichier .env trouvé"
}

generate_secrets() {
    if ! grep -q "your_super_secret" .env 2>/dev/null; then
        return
    fi
    
    print_info "Génération des secrets..."
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    MONGO_PASSWORD=$(openssl rand -base64 32)
    REDIS_PASSWORD=$(openssl rand -base64 32)
    
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i.bak "s/MONGO_ROOT_PASSWORD=.*/MONGO_ROOT_PASSWORD=$MONGO_PASSWORD/" .env
    sed -i.bak "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
    
    print_success "Secrets générés et sauvegardés dans .env"
}

start_dev() {
    print_header
    print_info "Démarrage en mode DÉVELOPPEMENT..."
    
    check_docker
    check_env
    
    docker-compose up -d mongo redis backend frontend
    
    print_success "Application démarrée!"
    print_info "Frontend: http://localhost:3000"
    print_info "Backend: http://localhost:8000"
    print_info "MongoDB: localhost:27017"
    print_info "Redis: localhost:6379"
    echo ""
    print_info "Voir les logs: docker-compose logs -f"
}

start_prod() {
    print_header
    print_info "Démarrage en mode PRODUCTION..."
    
    check_docker
    check_env
    
    print_warning "Mode production - Nginx sera utilisé comme reverse proxy"
    
    docker-compose --profile production up -d --build
    
    print_success "Application démarrée en production!"
    print_info "Application: https://your-domain.com"
    print_info "Health check: curl http://localhost:8000/health"
    echo ""
    print_info "Voir les logs: docker-compose logs -f"
}

stop_app() {
    print_header
    print_info "Arrêt de l'application..."
    
    docker-compose down
    
    print_success "Application arrêtée"
}

restart_app() {
    print_header
    print_info "Redémarrage de l'application..."
    
    docker-compose restart
    
    print_success "Application redémarrée"
}

show_logs() {
    print_header
    print_info "Affichage des logs (Ctrl+C pour quitter)..."
    echo ""
    
    docker-compose logs -f
}

show_status() {
    print_header
    print_info "Statut des services:"
    echo ""
    
    docker-compose ps
    
    echo ""
    print_info "Health checks:"
    
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend: OK"
    else
        print_error "Backend: DOWN"
    fi
    
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend: OK"
    else
        print_error "Frontend: DOWN"
    fi
}

# Main
case "${1:-dev}" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        print_header
        echo "Usage: $0 {dev|prod|stop|restart|logs|status}"
        echo ""
        echo "Commandes:"
        echo "  dev      - Démarrer en mode développement"
        echo "  prod     - Démarrer en mode production (avec Nginx)"
        echo "  stop     - Arrêter l'application"
        echo "  restart  - Redémarrer l'application"
        echo "  logs     - Afficher les logs"
        echo "  status   - Afficher le statut des services"
        exit 1
        ;;
esac

