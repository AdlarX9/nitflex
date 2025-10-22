package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"gin/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var storageBackend *storage.LocalStorage

func main() {
	// Load .env file if it exists (optional for Docker)
	errEnv := godotenv.Load()
	if errEnv != nil {
		log.Printf("Note: .env file not found, using environment variables from system")
	}

	// Get storage configuration from environment
	tempDir := os.Getenv("TEMP_DIR")
	moviesDir := os.Getenv("MOVIES_DIR")
	seriesDir := os.Getenv("SERIES_DIR")

	// Fallback to legacy paths if not configured
	if tempDir == "" {
		tempDir = "./uploads"
		log.Printf("TEMP_DIR not configured, using fallback: %s", tempDir)
	}
	if moviesDir == "" {
		moviesDir = "./movies"
		log.Printf("MOVIES_DIR not configured, using fallback: %s", moviesDir)
	}
	if seriesDir == "" {
		seriesDir = "./series"
		log.Printf("SERIES_DIR not configured, using fallback: %s", seriesDir)
	}

	// Validate storage configuration
	log.Println("Validating storage configuration...")
	if err := storage.ValidateStorageConfig(tempDir, moviesDir, seriesDir); err != nil {
		log.Fatalf("Storage validation failed: %v", err)
	}
	log.Println("Storage configuration validated successfully")

	// Initialize storage backend
	storageBackend = storage.NewLocalStorage([]string{tempDir, moviesDir, seriesDir})

	// Initialize job queue (2 workers by default)
	workers := 2
	log.Printf("Initializing job queue with %d workers", workers)
	InitJobQueue(workers)
	defer StopJobQueue()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("Received shutdown signal, cleaning up...")
		StopJobQueue()
		os.Exit(0)
	}()

	r := gin.Default()
	r.Use(cors.Default())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.Status(200)
	})

	// Users
	r.POST("/users", CreateUser)
	r.GET("/users", GetUsers)
	r.GET("/users/:id", GetUserByID)
	r.DELETE("/users/:id", DeleteUser)
	r.POST("/users/change_name/:id", ChangeUserName)

	// Movies
	r.POST("/movies", UploadMovie)
	r.GET("/movies", GetMovies)
	r.GET("/all_movies", GetAllMovies)
	r.GET("/movie/:id", GetMovieByID)
	r.GET("/tasks", getTasks)
	r.GET("/video/:id", VideoStreamHandler)

	// Ongoing Movies
	r.POST("/ongoing_movies", UpdateOnGoingMovie)
	r.GET("/ongoing_movies/:id", GetOnGoingMovieByID)
	r.DELETE("/ongoing_movies/:id", DeleteOnGoingMovie)
	r.DELETE("/all_ongoing_movies", DeleteAllOnGoingMovies)

	// Jobs
	r.POST("/jobs", CreateJob)
	r.GET("/jobs", GetJobs)
	r.GET("/jobs/:id", GetJobByID)
	r.POST("/jobs/:id/cancel", CancelJob)
	r.DELETE("/jobs/:id", DeleteJob)
	r.GET("/jobs/stream", StreamJobs)

	// Series
	r.POST("/series", CreateSeries)
	r.GET("/series", GetAllSeries)
	r.GET("/series/:id", GetSeriesByID)
	r.POST("/series/:id/episodes", AddEpisodeToSeries)
	r.GET("/episode/:id", GetEpisodeByID)
	r.GET("/video/episode/:id", EpisodeStreamHandler)

	// Ongoing Episodes
	r.POST("/ongoing_episodes", UpdateOnGoingEpisode)
	r.GET("/ongoing_episodes/:id", GetOnGoingEpisodeByID)
	r.DELETE("/ongoing_episodes/:id", DeleteOnGoingEpisode)

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
