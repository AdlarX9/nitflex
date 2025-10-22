# Nitflex Implementation Guide

## Overview

This document describes the complete implementation of Nitflex's extended features, including series support, robust transcoding pipeline, and production storage management.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Nitflex Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React + Vite)                                     │
│  ├── MediaUploader (Movies & Series)                         │
│  ├── SeriesSearch (TMDB Integration)                         │
│  ├── Enhanced Viewer (Episode Navigation)                    │
│  ├── TranscodeJobs (Real-time Progress)                      │
│  └── Explorer (Movies & Series)                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend (Go + Gin)                                          │
│  ├── Job Queue System (Worker Pool)                          │
│  ├── Storage Abstraction (LocalStorage)                      │
│  ├── Transcoding Pipeline (ffmpeg)                           │
│  ├── SSE Streaming (Real-time Updates)                       │
│  ├── Series Management (TMDB API)                            │
│  └── Metadata Tagging                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Electron (Optional Desktop App)                             │
│  ├── Local Transcoding (Hardware Accel)                      │
│  ├── Platform-specific Codecs                                │
│  └── IPC Progress Reporting                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Database (MongoDB)                                          │
│  ├── Movies, Series, Episodes                                │
│  ├── Users & Progress Tracking                               │
│  └── Job Persistence                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Foundation & Job System

### Storage Abstraction
**File**: `api/storage/storage.go`

- **LocalStorage** interface for file operations
- Directory validation on startup
- Support for temp, movies, and series directories
- Atomic file operations with cleanup

**Environment Variables**:
```bash
TEMP_DIR=/path/to/temp
MOVIES_DIR=/path/to/movies
SERIES_DIR=/path/to/series
```

### Job Model
**File**: `api/models.go`

```go
type Job struct {
    ID               primitive.ObjectID
    UserID           primitive.ObjectID
    Type             string  // "movie" or "episode"
    MediaID          primitive.ObjectID
    TmdbID           int
    Stage            string  // queued, transcoding, tagging, moving, completed, failed
    Progress         float64
    InputPath        string
    TranscodeMode    string  // "none", "server", "local"
    TranscodeOptions map[string]interface{}
    CreatedAt        primitive.DateTime
    UpdatedAt        primitive.DateTime
    CompletedAt      primitive.DateTime
}
```

### Job Queue
**File**: `api/jobs/queue.go`

- Worker pool with configurable concurrency
- Job cancellation support
- Real-time progress tracking
- Automatic retry on startup for pending jobs

**Features**:
- Subscribe/unsubscribe pattern for updates
- Stage progression tracking
- ETA calculation
- Error handling and recovery

### Transcoding Pipeline
**File**: `api/transcode/transcode.go`

- **Hardware Acceleration**:
  - macOS: VideoToolbox (h264_videotoolbox)
  - Windows: NVENC (h264_nvenc)
  - Linux: VAAPI (h264_vaapi)
  
- **Output Format**: Apple TV compatible MP4
  - H.264 High Profile, Level 4.1
  - AAC stereo audio @ 160kbps
  - Faststart flag for progressive download

### SSE Endpoint
**File**: `api/jobsHandlers.go`

```
GET /jobs/stream?userID=<id>
```

Real-time job updates via Server-Sent Events:
- Job progress updates
- Stage transitions
- Error notifications
- Keepalive pings

## Phase 2: Series Data Model & TMDB

### Models
**File**: `api/models.go`

```go
type Series struct {
    ID           primitive.ObjectID
    Title        string
    TmdbID       int
    ImdbID       string
    Poster       string
    Overview     string
    SeasonCount  int
    EpisodeCount int
}

type Episode struct {
    ID            primitive.ObjectID
    SeriesID      primitive.ObjectID
    TmdbID        int
    SeasonNumber  int
    EpisodeNumber int
    Title         string
    Overview      string
    FilePath      string
    Runtime       int
}

type OnGoingEpisode struct {
    ID        primitive.ObjectID
    UserID    primitive.ObjectID
    EpisodeID primitive.ObjectID
    SeriesID  primitive.ObjectID
    Position  int
    Duration  int
}
```

### TMDB Integration
**File**: `api/tmdb/tmdb.go`

Functions:
- `FetchSeries(tmdbID)` - Get TV show details
- `FetchSeason(seriesID, seasonNum)` - Get season info
- `FetchEpisode(seriesID, season, episode)` - Get episode details
- `DownloadPoster(posterPath, outputPath)` - Download images

### API Endpoints

**Series**:
```
POST   /series                      - Create series from TMDB
GET    /series                      - List all series
GET    /series/:id                  - Get series with episodes
POST   /series/:id/episodes         - Add episode
GET    /episode/:id                 - Get episode details
GET    /video/episode/:id           - Stream episode
```

**Progress Tracking**:
```
POST   /ongoing_episodes            - Update episode progress
GET    /ongoing_episodes/:id        - Get progress
DELETE /ongoing_episodes/:id        - Delete progress
```

## Phase 3: Series Upload Flow (Frontend)

### MediaUploader Component
**File**: `app/src/pages/MediaUploader.jsx`

Features:
- Tab-based interface (Movie | Series)
- Series search via TMDB
- Season/Episode number input
- Transcoding mode selection (none/server/local)
- Custom filename support
- Real-time validation

### SeriesSearch Component
**File**: `app/src/components/SeriesSearch.jsx`

Features:
- Debounced search (500ms)
- TMDB TV show search
- Visual results with posters
- Selected series display
- Easy change/reselection

## Phase 4: Enhanced Viewer & Progress

### Viewer Component
**File**: `app/src/pages/Viewer.jsx`

**New Features**:
- Automatic detection of movie vs episode
- Episode metadata display (Series - S01E01 - Title)
- Previous/Next episode navigation
- Separate progress tracking for episodes
- Episode still images as poster fallback

**Routes**:
```
/viewer/movie/:tmdbID       - Watch movie
/viewer/episode/:episodeID  - Watch episode
```

**Navigation Buttons**:
- ← Previous Episode (if available)
- Next Episode → (if available)
- Auto-fetch adjacent episodes

## Phase 5: Transcode Jobs UI

### TranscodeJobs Component
**File**: `app/src/components/TranscodeJobs.jsx`

Features:
- Floating widget (top-left)
- Collapsible interface
- Real-time SSE updates
- Progress bars with percentage
- ETA display
- Job cancellation
- Retry failed jobs
- Auto-hide when empty
- Stage indicators with color coding

**Job States**:
- 🔵 Queued - Waiting in queue
- 🟦 Transcoding - Video processing
- 🟪 Tagging - Adding metadata
- 🟨 Moving - File relocation
- 🟢 Completed - Success
- 🔴 Failed - Error occurred
- ⚫ Canceled - User canceled

## Phase 6: Electron Local Transcoding

### Transcode Module
**File**: `electron/transcode.js`

Features:
- Platform detection (macOS/Windows/Linux)
- Hardware acceleration selection
- FFmpeg progress parsing
- IPC communication
- Cancellation support

**Hardware Acceleration**:
```javascript
macOS:   VideoToolbox (h264_videotoolbox)
Windows: NVENC (h264_nvenc)
Linux:   VAAPI (h264_vaapi)
Fallback: libx264 software encoding
```

### Main Process Integration
**File**: `electron/main.js`

IPC Handlers:
- `process-movie` - Start local transcoding
- `check-dependencies` - Verify ffmpeg availability
- Progress updates via IPC channels

## Phase 7: Production Storage

### Storage Structure

```
MOVIES_DIR/
  ├── Inception_27205.mp4
  ├── The_Matrix_603.mp4
  └── Interstellar_157336.mp4

SERIES_DIR/
  ├── Breaking_Bad_1396/
  │   ├── Season 1/
  │   │   ├── S01E01_Pilot.mp4
  │   │   └── S01E02_Cats_in_the_Bag.mp4
  │   └── Season 2/
  │       └── S02E01_Seven_Thirty_Seven.mp4
  └── The_Office_2316/
      └── Season 1/
          └── S01E01_Pilot.mp4

TEMP_DIR/
  └── (temporary uploads)
```

### Migration Script
**File**: `api/migrate_storage.go`

Functions:
- `MigrateMovieStorage()` - Move files from old to new structure
- `RunMigration()` - Automatic migration on startup
- Progress logging
- Error recovery

**Usage**:
```go
// Run during startup
if err := RunMigration(); err != nil {
    log.Fatalf("Migration failed: %v", err)
}
```

### Environment Configuration
**File**: `.env.example`

```bash
# Production Storage Paths
TEMP_DIR=/mnt/nas/nitflex/temp
MOVIES_DIR=/mnt/nas/nitflex/movies
SERIES_DIR=/mnt/nas/nitflex/series

# TMDB API
TMDB_API_KEY=your_api_key_here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/nitflex

# API Port
PORT=8080
```

## Phase 8: Metadata Tagging

### Metadata Module
**File**: `api/transcode/metadata.go`

Functions:
- `EmbedMetadata()` - Add poster + text metadata
- `EmbedPosterOnly()` - Add poster thumbnail
- `ExtractPoster()` - Extract embedded poster
- `TagVideo()` - Convenience function

**Embedded Data**:
- Poster image (attached_pic)
- Title
- Year
- Description/Comment
- Genre
- Artist/Creator

**Usage**:
```go
metadata.EmbedMetadata(MetadataOptions{
    VideoPath:   "/path/to/video.mp4",
    PosterPath:  "/path/to/poster.jpg",
    Title:       "Inception",
    Year:        "2010",
    Description: "A thief who steals secrets...",
})
```

## Phase 9: Observability & Logging

### Logging System
**File**: `api/logging/logger.go`

Features:
- Structured logging with fields
- Log levels (DEBUG, INFO, WARN, ERROR)
- Trace ID generation
- Job event logging
- Error context tracking

**Usage**:
```go
import "gin/logging"

// Simple logging
logging.Info("Server started", map[string]interface{}{
    "port": 8080,
})

// Job events
logging.LogJobEvent(jobID, "transcoding", "Started transcoding", nil)

// Error logging
logging.LogError(err, "Failed to process job", map[string]interface{}{
    "jobID": jobID,
})
```

## API Reference

### Jobs API

```
POST   /jobs
Request:
{
  "userID": "string",
  "type": "movie|episode",
  "tmdbID": number,
  "inputPath": "string",
  "transcodeMode": "none|server|local"
}

GET    /jobs?userID=<id>           - List user's jobs
GET    /jobs/:id                   - Get job details
POST   /jobs/:id/cancel            - Cancel job
DELETE /jobs/:id                   - Delete completed job
GET    /jobs/stream?userID=<id>    - SSE stream
```

### Series API

```
POST   /series
Request: { "tmdbID": number }

GET    /series                     - List all series
GET    /series/:id                 - Get series + episodes

POST   /series/:id/episodes
Request:
{
  "seriesTmdbID": number,
  "seasonNumber": number,
  "episodeNumber": number,
  "filePath": "string",
  "customTitle": "string"
}
```

### Streaming API

```
GET    /video/:id                  - Stream movie
GET    /video/episode/:id          - Stream episode

Headers:
  Range: bytes=0-1023              - Partial content support
```

## Deployment

### Docker Compose Setup

```yaml
version: '3.8'
services:
  api:
    build: ./api
    ports:
      - "8080:8080"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nitflex
      - TEMP_DIR=/data/temp
      - MOVIES_DIR=/data/movies
      - SERIES_DIR=/data/series
      - TMDB_API_KEY=${TMDB_API_KEY}
    volumes:
      - /mnt/nas/nitflex:/data
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db

  web:
    build: ./app
    ports:
      - "80:80"

volumes:
  mongo_data:
```

### NAS Mount Example (Linux)

```bash
# Install CIFS utils
sudo apt-get install cifs-utils

# Create mount point
sudo mkdir -p /mnt/nas/nitflex

# Mount NAS
sudo mount -t cifs //nas.local/nitflex /mnt/nas/nitflex \
  -o username=user,password=pass,uid=1000,gid=1000

# Add to /etc/fstab for persistence
//nas.local/nitflex /mnt/nas/nitflex cifs credentials=/etc/nas-credentials,uid=1000,gid=1000 0 0
```

## Testing

### Manual Testing Checklist

**Movies**:
- [ ] Upload movie with TMDB search
- [ ] Transcode modes (none/server/local)
- [ ] Watch movie with progress tracking
- [ ] Resume from saved position

**Series**:
- [ ] Search and select series
- [ ] Upload episode with season/episode numbers
- [ ] Watch episode
- [ ] Navigate prev/next episodes
- [ ] Track episode progress

**Jobs**:
- [ ] View job progress in real-time
- [ ] Cancel running job
- [ ] Retry failed job
- [ ] SSE connection stability

**Storage**:
- [ ] Files stored in correct directories
- [ ] Migration from old structure
- [ ] FilePath field populated

## Troubleshooting

### FFmpeg not found (Electron)
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Job stuck in queue
```bash
# Check worker status
curl http://localhost:8080/jobs?userID=<id>

# Restart API to reload pending jobs
docker-compose restart api
```

### Storage validation failed
```bash
# Check directory permissions
ls -la /mnt/nas/nitflex

# Ensure directories exist
mkdir -p /mnt/nas/nitflex/{temp,movies,series}

# Set ownership
sudo chown -R 1000:1000 /mnt/nas/nitflex
```

### TMDB API errors
```bash
# Verify API key
echo $TMDB_API_KEY

# Test API directly
curl "https://api.themoviedb.org/3/tv/1396?api_key=$TMDB_API_KEY"
```

## Performance Optimization

### Transcoding Performance
- Enable hardware acceleration when available
- Use `veryfast` preset for software encoding
- Consider GPU transcoding for high volume

### Database Indexes
```javascript
db.movies.createIndex({ "tmdbID": 1 })
db.series.createIndex({ "tmdbID": 1 })
db.episodes.createIndex({ "seriesID": 1, "seasonNumber": 1, "episodeNumber": 1 })
db.jobs.createIndex({ "userID": 1, "stage": 1 })
```

### Caching
- Enable CDN for poster images
- Cache TMDB responses (24h TTL)
- Use Redis for session management

## Security Considerations

1. **File Access**: Validate all file paths to prevent directory traversal
2. **API Keys**: Never commit TMDB keys to version control
3. **User Authorization**: Implement proper auth middleware
4. **Input Validation**: Sanitize all user inputs
5. **Storage Permissions**: Restrict file system access

## Future Enhancements

- [ ] Multi-audio track support
- [ ] Subtitle management
- [ ] Automated library scanning
- [ ] Mobile app (React Native)
- [ ] Advanced search/filtering
- [ ] Watchlist management
- [ ] User recommendations
- [ ] Statistics dashboard

## License

MIT License - See LICENSE file for details
