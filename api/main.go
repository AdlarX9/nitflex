package main

import (
	"fmt"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"log"
	"os"
)

func main() {
	err := os.MkdirAll("./uploads", os.ModePerm)
	if err != nil {
		fmt.Printf("Failed to create uploads directory: %s\n", err.Error())
		return
	}

	// Load .env file if it exists (optional for Docker)
	errEnv := godotenv.Load()
	if errEnv != nil {
		log.Printf("Note: .env file not found, using environment variables from system")
	}

	// r.Use(cors.New(cors.Config{
	//     AllowOrigins:     []string{"http://192.168.0.210:5174"},
	//     AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
	//     AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
	//     ExposeHeaders:    []string{"Content-Length"},
	//     AllowCredentials: true,
	// }))

	r := gin.Default()
	r.Use(cors.Default())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
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

	r.Run(":8080") // par défaut sur localhost:8080
}
