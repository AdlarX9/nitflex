package main

import (
	"api/handlers"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if it exists (optional for Docker)
	errEnv := godotenv.Load()
	if errEnv != nil {
		log.Printf("Note: .env file not found, using environment variables from system")
	}

	r := gin.Default()
	corsCfg := cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Accept", "Last-Event-ID"},
		ExposeHeaders:   []string{"Content-Type"},
	}
	r.Use(cors.New(corsCfg))

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

	// Stream
	r.GET("/video/:id", handlers.VideoStreamHandler)
	r.GET("/video/episode/:id", handlers.EpisodeStreamHandler)
	r.GET("/video/:id/chapters", handlers.MovieChaptersHandler)
	r.GET("/video/episode/:id/chapters", handlers.EpisodeChaptersHandler)

	// HLS endpoints (master + assets via wildcard handler)
	r.GET("/hls/movie/:id/*asset", handlers.HLSMovieAsset)
	r.GET("/hls/episode/:id/*asset", handlers.HLSEpisodeAsset)

	// Ongoing Media (unified)
	r.POST("/ongoing_media", handlers.UpdateOnGoingMedia)
	r.GET("/ongoing_media/:id", handlers.GetOnGoingMediaByUserID)
	r.DELETE("/ongoing_media/:id", handlers.DeleteOnGoingMedia)

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
