# 📦 Guide d'installation détaillé - Nitflex

Ce guide vous accompagne pas à pas dans l'installation et la configuration de Nitflex sur votre serveur ou NAS.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Installation automatique](#installation-automatique)
3. [Installation manuelle](#installation-manuelle)
4. [Configuration](#configuration)
5. [Vérification](#vérification)
6. [Maintenance](#maintenance)

## Prérequis

### Système
- **OS**: Linux, macOS, ou Windows avec WSL2
- **RAM**: Minimum 2 GB recommandé
- **Espace disque**: 500 MB pour l'application + espace pour vos films

### Logiciels requis

#### Docker
```bash
# Vérifier l'installation
docker --version
# Devrait afficher: Docker version 20.x.x ou supérieur

# Installation sur Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Docker Compose
```bash
# Vérifier l'installation
docker compose version
# Devrait afficher: Docker Compose version v2.x.x ou supérieur
```

#### Clé API TMDB (The Movie Database)

1. Créez un compte sur [themoviedb.org](https://www.themoviedb.org/signup)
2. Allez dans Settings > API
3. Demandez une clé API (gratuit)
4. Copiez votre clé API (format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

## Installation automatique

### Méthode rapide (recommandée)

```bash
# 1. Cloner le dépôt
git clone <votre-repo-url>
cd nitflex

# 2. Rendre le script exécutable
chmod +x setup.sh

# 3. Lancer l'installation
./setup.sh
```

Le script va:
- ✅ Vérifier que Docker est installé
- ✅ Créer les fichiers de configuration
- ✅ Construire les images Docker
- ✅ Démarrer tous les services
- ✅ Afficher les URLs d'accès

### Que faire après le script?

1. **Éditer `app/.env.local`** et ajouter votre clé TMDB:
   ```env
   VITE_TMDB_KEY=votre_cle_tmdb_ici
   VITE_API=http://localhost/api
   ```

2. **Monter votre bibliothèque de films** (voir [Configuration](#configuration))

3. **Redémarrer**:
   ```bash
   docker compose restart
   ```

## Installation manuelle

### Étape 1: Cloner et préparer

```bash
git clone <votre-repo-url>
cd nitflex
```

### Étape 2: Configuration Frontend

Créez `app/.env.local`:
```env
# Clé API TMDB (obligatoire)
VITE_TMDB_KEY=votre_cle_tmdb_ici

# URL de l'API (ne pas modifier si vous utilisez Nginx)
VITE_API=http://localhost/api
```

### Étape 3: Configuration Backend

Créez `api/.env`:
```env
# URI MongoDB (ne pas modifier si vous utilisez Docker Compose)
MONGODB_URI=mongodb://mongodb:27017/nitflex

# Port de l'API (ne pas modifier)
PORT=8080
```

### Étape 4: Configuration Docker Compose

Éditez `compose.yaml` pour monter votre dossier de films:

```yaml
api:
  volumes:
    - ./api/uploads:/root/uploads
    - /chemin/vers/vos/films:/root/movies:ro  # 👈 Modifiez cette ligne
```

**Exemples de chemins:**

- **Linux**: `/mnt/nas/movies:/root/movies:ro`
- **macOS**: `/Users/votreuser/Movies:/root/movies:ro`
- **Windows (WSL2)**: `/mnt/c/Users/votreuser/Videos:/root/movies:ro`
- **Synology NAS**: `/volume1/video:/root/movies:ro`

⚠️ **Important**: L'option `:ro` (read-only) est recommandée pour éviter toute modification accidentelle.

### Étape 5: Construire et démarrer

```bash
# Construire les images
docker compose build

# Démarrer tous les services
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
```

Vous devriez voir:
```
NAME                    STATUS
nitflex-frontend        Up (healthy)
nitflex-api            Up (healthy)
nitflex-mongodb        Up (healthy)
```

### Étape 6: Vérifier l'accès

- **Frontend**: http://localhost
- **API**: http://localhost/api/movies
- **MongoDB**: mongodb://localhost:27017

## Configuration

### Structure des dossiers de films

Nitflex peut gérer n'importe quelle structure de dossiers. Exemples:

```
/movies/
├── Action/
│   ├── film1.mp4
│   └── film2.mkv
├── Comedie/
│   └── film3.mp4
└── film4.avi
```

### Formats vidéo supportés

- ✅ **MP4** (H.264) - Recommandé
- ✅ **MKV** (H.264)
- ✅ **AVI**
- ✅ **MOV**
- ✅ **WEBM**

⚠️ Pour une compatibilité maximale, utilisez **H.264/AAC en MP4**.

### Configuration Nginx (personnalisation)

Si vous souhaitez utiliser un port différent, éditez `nginx/nginx.conf`:

```nginx
server {
    listen 8080;  # Changez le port ici
    # ...
}
```

Puis mettez à jour `compose.yaml`:
```yaml
frontend:
  ports:
    - "8080:80"  # Changez le port externe
```

### Variables d'environnement avancées

#### Frontend (`app/.env.local`)

```env
# API TMDB
VITE_TMDB_KEY=votre_cle_tmdb

# URL de l'API backend
VITE_API=http://localhost/api

# Langue TMDB (optionnel)
VITE_TMDB_LANGUAGE=fr-FR
```

#### Backend (`api/.env`)

```env
# MongoDB
MONGODB_URI=mongodb://mongodb:27017/nitflex

# Port API
PORT=8080

# Taille max upload (optionnel, défaut: système)
MAX_FILE_SIZE=10737418240  # 10 GB
```

## Vérification

### Vérifier les services

```bash
# Statut des conteneurs
docker compose ps

# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f frontend
docker compose logs -f api
docker compose logs -f mongodb
```

### Tests manuels

1. **Frontend accessible**:
   ```bash
   curl http://localhost
   # Devrait retourner du HTML
   ```

2. **API répond**:
   ```bash
   curl http://localhost/api/movies
   # Devrait retourner [] ou une liste de films
   ```

3. **MongoDB accessible**:
   ```bash
   docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   # Devrait retourner: { ok: 1 }
   ```

### Problèmes courants

#### Le frontend ne se charge pas
```bash
# Vérifier les logs
docker compose logs frontend

# Rebuild
docker compose up -d --build frontend
```

#### L'API ne répond pas
```bash
# Vérifier que MongoDB est prêt
docker compose ps mongodb

# Redémarrer l'API
docker compose restart api
```

#### Erreur TMDB "Invalid API key"
- Vérifiez que vous avez bien copié la clé complète
- Assurez-vous qu'il n'y a pas d'espaces avant/après
- Redémarrez: `docker compose restart frontend`

## Maintenance

### Mise à jour de l'application

```bash
# 1. Arrêter les services
docker compose down

# 2. Récupérer les dernières modifications
git pull

# 3. Rebuild et redémarrer
docker compose up -d --build
```

### Sauvegarde des données

**MongoDB (base de données)**:
```bash
# Exporter
docker compose exec mongodb mongodump --out=/data/backup

# Copier localement
docker cp nitflex-mongodb:/data/backup ./mongodb_backup

# Restaurer
docker compose exec mongodb mongorestore /data/backup
```

**Uploads (posters, etc.)**:
```bash
# Sauvegarder
tar -czf uploads_backup.tar.gz api/uploads/

# Restaurer
tar -xzf uploads_backup.tar.gz
```

### Nettoyage

```bash
# Supprimer les conteneurs (conserve les données)
docker compose down

# Supprimer tout (⚠️ perte de données)
docker compose down -v

# Nettoyer les images non utilisées
docker system prune -a
```

### Logs et monitoring

```bash
# Voir l'utilisation des ressources
docker stats

# Taille des volumes
docker system df -v

# Nettoyer les logs (si trop volumineux)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' nitflex-frontend)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' nitflex-api)
```

## Accès depuis l'extérieur

### Option 1: Tunnel SSH
```bash
ssh -L 8080:localhost:80 user@votre-serveur
# Accéder via http://localhost:8080
```

### Option 2: Nginx reverse proxy (production)

Installez Nginx sur votre machine hôte et configurez:

```nginx
server {
    listen 80;
    server_name nitflex.votredomaine.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 3: Cloudflare Tunnel (recommandé pour NAS)

Sécurisé et sans ouverture de ports:
```bash
cloudflared tunnel create nitflex
cloudflared tunnel route dns nitflex nitflex.votredomaine.com
cloudflared tunnel run --url http://localhost:80 nitflex
```

## Support

En cas de problème:

1. Vérifiez les logs: `docker compose logs`
2. Consultez la [documentation](README.md)
3. Vérifiez les issues GitHub
4. Créez une nouvelle issue avec vos logs

---

**Bon streaming! 🎬**
