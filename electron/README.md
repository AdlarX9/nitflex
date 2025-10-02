# 🖥️ Nitflex Electron App

Application desktop avec traitement vidéo local.

## Prérequis

```bash
# macOS
brew install handbrake ffmpeg atomicparsley

# Ubuntu
sudo apt install handbrake-cli ffmpeg atomicparsley
```

## Développement

```bash
cd electron
npm install
npm run dev
```

## Build

```bash
npm run build        # Auto-detect platform
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

## Utilisation

Lors de l'upload, choisissez :
- **Local** : Traitement sur votre ordinateur
- **Serveur** : Traitement sur l'API backend

Le traitement local nécessite HandBrake, ffmpeg et AtomicParsley installés.
