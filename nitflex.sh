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
	echo "  update			Mise à jour du projet"
	echo "  format			Formatage du code"
	echo "  dev				Lancement en mode développeur"
	echo "  deploy			Lancement en mode production"
	echo "  help				Afficher cette aide"
	echo ""
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
}

deploy() {
	chmod +x scripts/setup.sh
	./scripts/setup.sh
}

dev() {
	chmod +x scripts/setup_dev.sh
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
