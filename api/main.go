package main

import (
	"api/utils"
	"api/handlers"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var storageBackend *utils.LocalStorage

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
	if err := utils.ValidateStorageConfig(tempDir, moviesDir, seriesDir); err != nil {
		log.Fatalf("Storage validation failed: %v", err)
	}
	log.Println("Storage configuration validated successfully")

	// Initialize storage backend
	storageBackend = utils.NewLocalStorage([]string{tempDir, moviesDir, seriesDir})

	// Initialize job queue (2 workers by default)
	workers := 2
	log.Printf("Initializing job queue with %d workers", workers)
	utils.InitJobQueue(workers)
	defer utils.StopJobQueue()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("Received shutdown signal, cleaning up...")
		utils.StopJobQueue()
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
	r.POST("/users", handlers.CreateUser)
	r.GET("/users", handlers.GetUsers)
	r.GET("/users/:id", handlers.GetUserByID)
	r.DELETE("/users/:id", handlers.DeleteUser)
	r.POST("/users/change_name/:id", handlers.ChangeUserName)

	// Movies
	r.POST("/movies", handlers.UploadMovie)
	r.GET("/movies", handlers.GetMovies)
	r.GET("/movie/:id", handlers.GetMovieByID)

	// Series
	r.POST("/series", handlers.CreateSeries)
	r.GET("/series", handlers.GetAllSeries)
	r.GET("/series/:id", handlers.GetSeriesByID)
	r.GET("/episode/:id", handlers.GetEpisodeByID)
	r.POST("/series/:id/episodes", handlers.AddEpisodeToSeries)

	// Stream
	r.GET("/video/:id", handlers.VideoStreamHandler)
	r.GET("/video/episode/:id", handlers.EpisodeStreamHandler)

	// Ongoing Movies & Episodes
	r.POST("/ongoing_movies", handlers.UpdateOnGoingMovie)
	r.POST("/ongoing_episodes", handlers.UpdateOnGoingEpisode)
	r.GET("/ongoing_movies/:id", handlers.GetOnGoingMovieByID)
	r.GET("/ongoing_episodes/:id", handlers.GetOnGoingEpisodeByID)
	r.DELETE("/ongoing_movies/:id", handlers.DeleteOnGoingMovie)
	r.DELETE("/ongoing_episodes/:id", handlers.DeleteOnGoingEpisode)

	// Jobs
	r.GET("/jobs", handlers.GetJobs)
	r.GET("/jobs/:id", handlers.GetJobByID)
	r.POST("/jobs/:id/cancel", handlers.CancelJob)
	// SSE
	r.GET("/jobs/stream", handlers.StreamJobs)

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
