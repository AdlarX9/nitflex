# 🎬 Nitflex

**Nitflex** est une plateforme de streaming privée pour gérer et visionner vos films stockés sur un serveur NAS. Ce projet est une application complète avec un frontend React moderne, une API backend en Go, et MongoDB pour la persistance des données.
> ⚠️ **Disclaimer**: This software is not inspired by the well-known application known as Netflix. Any resemblance or similarity to the latter is purely and entirely coincidental.

## ✨ Fonctionnalités principales

- 🎬 **Streaming vidéo** optimisé avec support du range request
- 🔍 **Recherche avancée** de films avec filtres et tri
- 📱 **100% Responsive** - Interface adaptée mobile, tablette et desktop
- 🎨 **UI moderne** avec animations Framer Motion
- 👤 **Multi-utilisateurs** avec gestion de profils
- ⏯️ **Films en cours** - Reprenez là où vous vous êtes arrêté
- 🎭 **Intégration TMDB** pour les métadonnées et posters
- 📤 **Upload de films** avec métadonnées automatiques
- 🎞️ **Traitement vidéo** - Local (Electron) ou serveur (API)
- 🖥️ **Application Electron** - Version desktop avec traitement local
- 🐳 **Docker** - Déploiement simplifié avec Docker Compose
- 🔄 **Nginx reverse proxy** pour une architecture production-ready

### Prérequis

- Docker & Docker Compose
- Clé API TMDB (gratuite sur [themoviedb.org](https://www.themoviedb.org/settings/api))
- Un dossier contenant vos films

### Installation en une commande

```bash
./setup.sh
```

Le script vous guidera à travers la configuration.

### Installation manuelle

1. **Cloner le dépôt**
```bash
git clone <votre-repo>
cd nitflex
```

2. **Configurer l'environnement**

Créez `app/.env.local`:
```env
VITE_TMDB_KEY=votre_cle_api_tmdb
VITE_API=http://localhost/api
```

Créez `api/.env`:
```env
MONGODB_URI=mongodb://mongodb:27017/nitflex
PORT=8080
```

3. **Monter votre bibliothèque de films**

Éditez `compose.yaml` et mettez à jour le volume des films:
```yaml
volumes:
  - /chemin/vers/vos/films:/root/movies:ro
```

4. **Démarrer l'application**
```bash
docker compose up -d --build
```

5. **Accéder à l'application**

Ouvrez votre navigateur sur `http://localhost`

## 📖 Architecture

```
nitflex/
├── app/              # Frontend React + Vite
│   ├── src/
│   │   ├── pages/    # Pages de l'application
│   │   ├── components/ # Composants réutilisables
│   │   └── app/      # Context, hooks, utils
│   └── package.json
├── api/              # Backend Go + Gin
│   ├── main.go
│   ├── models.go
│   └── *Handlers.go
├── nginx/            # Configuration Nginx
│   └── nginx.conf
├── compose.yaml      # Docker Compose
├── Dockerfile.api    # Image Docker API
├── Dockerfile.frontend # Image Docker Frontend
└── setup.sh          # Script d'installation
```

## 🛠️ Développement

### Frontend
```bash
cd app
pnpm install
pnpm run dev
```

### Backend
```bash
cd api
go run .
```

### MongoDB
```bash
docker run -d -p 27017:27017 mongo:7.0-alpine
```

## 🎯 Utilisation

### 1. Créer un profil utilisateur
- Cliquez sur le bouton "+" sur la page d'accueil
- Entrez un pseudo

### 2. Uploader un film
- Cliquez sur "Uploader film" en haut à droite
- Sélectionnez votre fichier vidéo
- Recherchez le film sur TMDB
- Confirmez l'upload

### 3. Regarder un film
- Parcourez votre bibliothèque dans l'Explorer
- Cliquez sur un film pour voir les détails
- Cliquez sur "Lecture" pour commencer

### 4. Rechercher un film
- Utilisez la page Recherche
- Filtrez par genre, titre ou ordre

## 🔧 Configuration avancée

### Nginx Reverse Proxy

Le projet inclut une configuration Nginx optimisée pour:
- Proxy de l'API backend
- Streaming vidéo avec support des range requests
- Compression Gzip
- Cache des assets statiques

### Personnalisation

**Modifier les genres disponibles** (`app/src/pages/Search.jsx`):
```javascript
const GENRES = {
  '': 'Tout',
  action: 'Action',
  // Ajoutez vos genres
}
```

**Changer la couleur principale** (`app/tailwind.config.js`):
```javascript
colors: {
  'nitflex-red': '#E50914', // Votre couleur
}
```

## 📱 Responsive Design

Nitflex est entièrement responsive:
- 📱 **Mobile** (< 768px): Interface tactile optimisée
- 💻 **Tablet** (768px - 1024px): Layout adaptatif
- 🖥️ **Desktop** (> 1024px): Expérience complète

## 🐛 Dépannage

### La vidéo ne se charge pas
1. Vérifiez que le fichier existe dans le dossier monté
2. Vérifiez les logs: `docker compose logs api`
3. Vérifiez le format vidéo (H.264 recommandé)

### Erreur de connexion MongoDB
1. Attendez que MongoDB soit prêt (healthcheck)
2. Vérifiez: `docker compose ps`
3. Redémarrez: `docker compose restart mongodb`

### Problèmes de build frontend
1. Supprimez node_modules: `rm -rf app/node_modules`
2. Rebuild: `docker compose up --build frontend`

## 🤝 Contribution

Les contributions sont les bienvenues! N'hésitez pas à:
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Redémarrer un service
docker compose restart <service>

# Arrêter tout
docker compose down

# Supprimer les volumes (⚠️ perte de données)
docker compose down -v

# Rebuild complet
docker compose up -d --build --force-recreate

# Accéder au shell d'un conteneur
docker compose exec api sh
docker compose exec frontend sh
```

## 📊 Technologies utilisées

### Frontend
- **React 19** - Framework UI
- **Vite 7** - Build tool
- **TailwindCSS 4** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **Axios** - HTTP client

### Backend
- **Go 1.24** - Langage
- **Gin** - Framework HTTP
- **MongoDB** - Base de données
- **CORS** - Cross-origin support

### Infrastructure
- **Docker & Docker Compose** - Containerisation
- **Nginx** - Reverse proxy
- **MongoDB 7** - Database

## 📄 Licence

GNU GPL 3.0 - Voir le fichier [LICENSE](LICENSE)

## 🙏 Remerciements

- [TMDB](https://www.themoviedb.org/) pour l'API de métadonnées
- [React Icons](https://react-icons.github.io/react-icons/) pour les icônes
- La communauté open-source

---

**Made with ❤️ for personal NAS movie streaming**
