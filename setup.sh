#!/bin/bash

# Nitflex Setup Script
# This script helps you set up and run the Nitflex application

set -e

echo "🎬 Nitflex Setup Script"
echo "======================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use the appropriate compose command
COMPOSE_CMD="docker compose"
if ! command -v docker compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Vérifie si le fichier ./.env n'existe pas
if [ ! -f "./.env" ]; then
    # Duplication de ./.env.local en ./.env
    cp ./.env.local ./.env
else
    # Sinon, copie ./.env dans ./app/.env et ./api/.env
    cp ./.env ./app/.env
    cp ./.env ./api/.env
fi

echo "🔨 Building Docker containers..."
$COMPOSE_CMD build

echo ""
echo "🚀 Starting Nitflex..."
$COMPOSE_CMD up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if $COMPOSE_CMD ps | grep -q "nitflex-frontend"; then
    echo ""
    echo "✅ Nitflex is now running!"
    echo ""
    echo "🌐 Access the application at: http://localhost"
    echo "🔧 API available at: http://localhost:8080"
    echo "💾 MongoDB available at: mongodb://localhost:27017"
    echo ""
    echo "📋 Useful commands:"
    echo "  - View logs: $COMPOSE_CMD logs -f"
    echo "  - Stop: $COMPOSE_CMD down"
    echo "  - Restart: $COMPOSE_CMD restart"
    echo "  - Rebuild: $COMPOSE_CMD up -d --build"
    echo ""
else
    echo "❌ Something went wrong. Check logs with: $COMPOSE_CMD logs"
    exit 1
fi
