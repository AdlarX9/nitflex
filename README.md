# 🎬 Nitflex

**Nitflex** is a private streaming platform for managing and watching films stored on a NAS server. This project is a complete application featuring a modern React frontend, a Go backend API, and MongoDB for data persistence.

> ⚠️ **Disclaimer**: This software is not inspired by the well-known application Netflix. Any resemblance or similarity is purely coincidental.

## ✨ Key Features

### 🎬 Streaming & Playback
- Optimized video streaming with Range Request support
- Full management of Movies and TV Series
- Episode navigation with automatic next/previous handling
- Continue watching — resume exactly where you left off
- Progress tracking for both movies and episodes

### 🎨 User Interface
- 100% responsive — optimized for mobile, tablet, and desktop
- Modern UI with Framer Motion animations
- Multi-user support with profile management
- Advanced movie search with filters and sorting
- Real-time display of transcoding tasks

### 🔧 Transcoding & Processing
- Job system with queue and workers
- Server-side transcoding — processing in the Go backend
- Local transcoding via Electron with hardware acceleration
- Multi-platform hardware support:
  - macOS: VideoToolbox
  - Windows: NVENC
  - Linux: VAAPI
- Real-time progress via Server-Sent Events
- Job cancellation and automatic retries

### 📚 Content Management
- TMDB integration for movies and TV series
- Smart upload with automatic detection
- Enriched metadata — posters, descriptions, release dates
- Automatic tagging of video files
- Organized and scalable storage structure

### 🏗️ Infrastructure
- Electron application — desktop version with local processing
- Docker — simplified deployment with Docker Compose
- Nginx reverse proxy for a production-ready architecture
- MongoDB — robust data persistence
- Automatic migration of existing files

### Prerequisites

- Docker & Docker Compose
- TMDB API key (free on [The Movie Database](https://www.themoviedb.org/settings/api))
- A directory containing your movie files

### One-Command Installation

```bash
./setup.sh
```

The script will guide you through the configuration.

### Manual Installation

1. Clone the repository:
```bash
git clone <your-repo>
cd nitflex
```

2. Configure the environment:

Install required dependencies and generate environment files:
```bash
chmod +x ./nitflex.sh
./nitflex.sh setup
```

Then edit the `.env` file with your own settings.

3. Start the application:

Production mode:
```bash
./nitflex.sh deploy
```

Development mode:
```bash
./nitflex.sh dev
```

4. Access the application:

Open your browser at `http://localhost`.

## 📖 Architecture

```
nitflex/
├── app/                # React + Vite frontend
│   ├── src/
│   │   ├── pages/      # Application pages
│   │   ├── components/ # Reusable components
│   │   └── app/        # Context, hooks, utilities
│   └── package.json
├── api/                # Go backend + Gin
│   ├── main.go
│   ├── handlers/       # Route handlers
│   └── utils.go        # Utilities
├── nginx/              # Nginx configuration
│   └── nginx.conf
├── compose.yaml        # Docker Compose
├── Dockerfile.api      # API Docker image
├── Dockerfile.frontend # Frontend Docker image
└── nitflex.sh          # Application management script
```

## 🎯 Usage

### 1. Create a user profile
- Click the “+” button on the home page
- Enter a display name

### 2. Upload a movie
- Click “Upload movie” in the top-right corner
- Select your video file
- Search for the movie on TMDB
- Confirm the upload

### 3. Watch a movie
- Browse your library in the Explorer
- Click a movie to view details
- Click “Play” to start playback

### 4. Search for a movie
- Use the Search page
- Filter by genre, title, or sort order

## 🔧 Advanced Configuration

### Nginx Reverse Proxy

The project includes an Nginx configuration optimized for:
- Proxying the backend API
- Video streaming with Range Request support
- Gzip compression
- Static asset caching

### Customization

Modify available genres (`app/src/pages/Search.jsx`):
```javascript
const GENRES = {
  '': 'All',
  action: 'Action',
  // Add your genres
}
```

Change the primary color (`app/tailwind.config.js`):
```javascript
colors: {
  'nitflex-red': '#E50914', // Your primary color
}
```

## 🤝 Contributing

Contributions are welcome. Please:
1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📊 Technologies Used

### Frontend
- React 19
- Vite 7
- TailwindCSS 4
- Framer Motion
- React Router
- TanStack Query
- Axios

### Backend
- Go 1.24
- Gin
- MongoDB
- CORS

### Infrastructure
- Docker & Docker Compose
- Nginx
- MongoDB 7

## 📄 License

GNU GPL 3.0 — see the [LICENSE](LICENSE) file.

## 🙏 Acknowledgements

- [TMDB](https://www.themoviedb.org/) for the metadata API
- [React Icons](https://react-icons.github.io/react-icons/) for icons
- The open-source community

---

Made with ❤️ for personal movie streaming