# 📋 Changelog - Nitflex

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [2.0.0] - 2025-10-01

### 🎉 Refonte majeure

#### ✨ Nouvelles fonctionnalités

- **Docker Compose complet** avec nginx reverse proxy
  - Configuration production-ready
  - Support du streaming vidéo optimisé
  - Healthchecks pour tous les services
  - Volume persistant pour MongoDB

- **Films en cours (Ongoing Movies)**
  - Interface complète avec barre de progression
  - Reprise automatique de la lecture
  - Suppression des films en cours
  - Fix du bug de duplication (requêtes multiples)

- **Recherche améliorée**
  - Recherche en temps réel avec debounce
  - Filtres par genre et ordre
  - États vides avec messages informatifs
  - Animations de transition fluides

- **Gestion d'erreurs robuste**
  - Messages d'erreur détaillés pour le streaming vidéo
  - Écrans d'erreur animés avec options de récupération
  - Gestion des films introuvables
  - Validation côté client et serveur

#### 🎨 Améliorations UI/UX

- **Design System modernisé**
  - Animations Framer Motion sur toutes les pages
  - Transitions fluides et subtiles
  - Effets hover et interactions tactiles
  - Design responsive mobile-first

- **Page d'accueil repensée**
  - Sélection de profil animée
  - Cartes utilisateur avec effets 3D
  - Modal de création de compte amélioré
  - Gradients et ombres modernes

- **Page compte utilisateur**
  - Interface centrée et épurée
  - Formulaire de modification avec validation
  - Messages de succès/erreur animés
  - Zone de danger pour la suppression

- **Explorer amélioré**
  - Carousel horizontal pour les films en cours
  - Animations d'apparition en cascade
  - Sections bien délimitées
  - Responsive sur tous les écrans

- **Lecteur vidéo optimisé**
  - Contrôles tactiles améliorés
  - Gestion du fullscreen automatique
  - Sauvegarde automatique de la progression
  - Interface épurée qui se cache

#### 🔧 Améliorations techniques

- **Frontend**
  - Refactorisation complète des composants
  - Hooks personnalisés optimisés
  - Debounce pour les requêtes API
  - Code splitting et lazy loading
  - Meilleure gestion d'état

- **Backend**
  - Variables d'environnement pour MongoDB
  - Logique de sauvegarde des films en cours optimisée
  - Prévention des doublons avec $addToSet
  - Handlers refactorisés

- **Infrastructure**
  - Configuration Nginx optimisée
  - Support des range requests pour le streaming
  - Compression gzip
  - Cache des assets statiques
  - Healthchecks Docker

#### 📱 Responsive & Mobile

- Interface 100% responsive
- Contrôles tactiles optimisés
- Menu latéral adaptatif sur mobile
- Swipe gestures pour la vidéo
- Layout flexbox/grid moderne

#### 📚 Documentation

- README complet avec émojis
- Guide d'installation détaillé (INSTALLATION.md)
- Script de setup automatisé
- Fichier .env.example
- Commentaires de code améliorés

### 🐛 Corrections de bugs

- **Fix critique**: Duplication des films en cours
  - Implémentation d'un système de debounce
  - Vérification avec flag `isSaving`
  - Sauvegarde uniquement sur pause ou sortie

- **Fix**: Recherche qui ne fonctionnait pas
  - Intégration correcte avec l'API
  - Paramètres de requête corrigés
  - États de chargement ajoutés

- **Fix**: Erreurs de connexion MongoDB
  - URI configurables via environnement
  - Meilleure gestion des timeouts

- **Fix**: Problèmes de responsive
  - Breakpoints Tailwind utilisés correctement
  - Classes responsive sur tous les composants
  - Overflow gérés proprement

### 🔄 Changements cassants

- **API URL**: Maintenant derrière `/api` avec nginx
- **Variables d'environnement**: Nouveaux noms (VITE_*)
- **Structure Docker**: Nouveau compose.yaml

### 📦 Dépendances

#### Ajoutées
- `framer-motion@^12.23.15` - Animations
- `@tanstack/react-query@^5.89.0` - Data fetching

#### Mises à jour
- `react@^19.1.1`
- `vite@^7.1.6`
- `tailwindcss@^4.1.13`

## [1.0.0] - Date initiale

### Fonctionnalités initiales

- Application de base fonctionnelle
- Upload de films
- Lecture vidéo
- Gestion des utilisateurs
- Intégration TMDB

---

## Format

Ce changelog suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

### Types de changements

- **Ajouté** pour les nouvelles fonctionnalités
- **Modifié** pour les changements de fonctionnalités existantes
- **Obsolète** pour les fonctionnalités bientôt supprimées
- **Supprimé** pour les fonctionnalités supprimées
- **Corrigé** pour les corrections de bugs
- **Sécurité** pour les vulnérabilités corrigées
