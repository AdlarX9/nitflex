#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

help() {
	echo -e "${BLUE}Nitflex - Interface de Gestion${NC}"
	echo "================================="
	echo ""
	echo "Usage: $0 [command]"
	echo ""
	echo -e "${YELLOW}Commandes:${NC}"
	echo "  setup				Configuration initiale du projet"
	echo "  update			Mise à jour du projet"
	echo "  format			Formatage du code"
	echo "  dev				Lancement en mode développeur"
	echo "  deploy			Lancement en mode production"
	echo "  help				Afficher cette aide"
	echo ""
}

setup() {
	echo -e "${BLUE}Configuration initiale de Nitflex...${NC}"

	# Make scripts executable
	chmod +x scripts/setup.sh
	chmod +x scripts/setup_dev.sh

	# Check if Docker is installed
	if ! command -v docker &> /dev/null; then
		echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
		exit 1
	fi

	# Check if go is installed
	if ! command -v go &> /dev/null; then
		echo -e "${RED}❌ Go is not installed. Please install Go first.${NC}"
		exit 1
	fi

	# Check if node is installed
	if ! command -v npm &> /dev/null; then
		echo -e "${RED}❌ Node is not installed. Please install Node first.${NC}"
		exit 1
	fi

	# Check if pnpm is installed
	if ! command -v pnpm &> /dev/null; then
		echo -e "${YELLOW}pnpm is not installed. Installing...${NC}"
		npm install -g pnpm
	fi

	# Install dependencies
	echo -e "${BLUE}📦 Installation des dépendances...${NC}"
	cd app
	pnpm install
	cd ../electron
	npm install
	cd ../api
	go mod download
	cd ../

	# Setup env if needed
	if [ ! -f ".env" ]; then
		echo -e "${BLUE}⚙️  Configuration de l'environnement...${NC}"
		cp .env.example .env
		echo -e "${YELLOW}⚠️  Éditez .env avec vos credentials${NC}"
	fi
		
	# Setup web env if needed
	if [ ! -f "app/.env" ]; then
		echo -e "${BLUE}⚙️  Configuration de l'environnement web...${NC}"
		cp app/.env app/.env
		echo -e "${YELLOW}⚠️  Éditez app/.env avec vos credentials${NC}"
	fi

	# Setup desktop env if needed
	if [ ! -f "api/.env" ]; then
		echo -e "${BLUE}⚙️  Configuration de l'environnement desktop...${NC}"
		cp api/.env api/.env
		echo -e "${YELLOW}⚠️  Éditez api/.env avec vos credentials${NC}"
	fi

	echo -e "${GREEN}✅ Configuration terminée !${NC}"
}

format() {
	echo -e "${BLUE}🎨 Formatage du code...${NC}"
	cd app
	npm run format
	cd ../api
	go fmt ./utils
	go fmt ./handlers
	go fmt ./
	cd ../
}

update() {
	git pull origin main
	setup
}

deploy() {
	./scripts/setup.sh
}

dev() {
	./scripts/setup_dev.sh
}

# Main command handling
case "$1" in
	"deploy")
		deploy
		;;

	"dev")
		dev
		;;

	"setup")
		setup
		;;
	
	"format")
		format
		;;
	
	"update")
		update
		;;
		
	"help"|"--help"|"-h"|"")
		help
		;;
		
	*)
		echo -e "${RED}❌ Commande inconnue: '$1'${NC}"
		echo ""
		help
		exit 1
		;;
esac
