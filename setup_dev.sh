#!/bin/bash

# Nitflex Dev Setup Script
# Starts all services in development mode with hot reload

set -e

echo "🎬 Nitflex Dev Setup Script"
echo "==========================="
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

# Create environment files if they don't exist
if [ ! -f "./.env" ]; then
    # Duplication de ./.env.local en ./.env
    cp ./.env.local ./.env
else
    # Sinon, copie ./.env dans ./app/.env et ./api/.env
    cp ./.env ./app/.env
    cp ./.env ./api/.env
	echo "GIN_MODE=debug" >> ./api/.env
fi

echo "🔨 Building development Docker images..."
$COMPOSE_CMD -f compose.yaml -f compose.dev.yaml build

echo ""
echo "🚀 Starting Nitflex in development mode..."
echo ""
echo "📦 Services starting:"
echo "  - MongoDB (port 27017)"
echo "  - Go API with hot reload (port 8080)"
echo "  - React Frontend with Vite (port 5173)"
echo ""

$COMPOSE_CMD -f compose.yaml -f compose.dev.yaml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if $COMPOSE_CMD ps | grep -q "nitflex-frontend-dev"; then
    echo ""
    echo "✅ Nitflex is now running in development mode!"
    echo ""
    echo "🌐 Access the application at: http://localhost:5173"
    echo "🔧 API available at: http://localhost:8080"
    echo "💾 MongoDB available at: mongodb://localhost:27017"
    echo ""
    echo "📋 Useful commands:"
    echo "  - View logs: $COMPOSE_CMD -f compose.yaml -f compose.dev.yaml logs -f"
    echo "  - Stop: $COMPOSE_CMD -f compose.yaml -f compose.dev.yaml down"
    echo "  - Restart a service: $COMPOSE_CMD -f compose.yaml -f compose.dev.yaml restart <service>"
    echo ""
    echo "🔥 Hot reload is enabled for both frontend and backend!"
    echo ""
else
    echo "❌ Something went wrong. Check logs with: $COMPOSE_CMD -f compose.yaml -f compose.dev.yaml logs"
    exit 1
fi

# Show logs in follow mode
$COMPOSE_CMD -f compose.yaml -f compose.dev.yaml logs -f
