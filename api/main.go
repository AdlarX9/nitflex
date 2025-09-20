package main

import (
	"fmt"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"os"
)

func main() {
	err := os.MkdirAll("./uploads", os.ModePerm)
	if err != nil {
		fmt.Printf("Failed to create uploads directory: %s\n", err.Error())
		return
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

	// Users
	r.POST("/users", CreateUser)
	r.GET("/users", GetUsers)
	r.GET("/users/:id", GetUserByID)
	r.DELETE("/users/:id", DeleteUser)
	r.POST("/users/change_name/:id", ChangeUserName)

	// Movies
	r.POST("/movies", UploadMovie)
	r.GET("/movies", GetMovies)
	r.GET("/movies/:id", GetMovieByID)

	// Ongoing Movies
	r.POST("/ongoing_movies", UpdateOnGoingMovie)
	r.DELETE("/ongoing_movies/:id", DeleteOnGoingMovie)

	r.Run(":8080") // par défaut sur localhost:8080
}
