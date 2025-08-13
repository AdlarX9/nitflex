package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// Users
	r.POST("/users", CreateUser)
	r.GET("/users", GetUsers)
	r.GET("/users/:id", GetUserByID)
	r.DELETE("/users/:id", DeleteUser)

	// Movies
	r.POST("/movies", UploadMovie)
	r.GET("/movies", GetMovies)
	r.GET("/movies/:id", GetMovieByID)

	// Ongoing Movies
	r.POST("/ongoing_movies", UpdateOnGoingMovie)
	r.DELETE("/ongoing_movies/:id", DeleteOnGoingMovie)

	r.Run(":8080") // par défaut sur localhost:8080
}
