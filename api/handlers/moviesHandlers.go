package handlers

import (
	"api/utils"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// POST /movies
func UploadMovie(c *gin.Context) {
	type Metadata struct {
		TmdbID      int     `json:"tmdbID" binding:"required"`
		ImdbID      string  `json:"imdbID" binding:"required"`
		Title       string  `json:"title" binding:"required"`
		Poster      string  `json:"poster" binding:"required"`
		Rating      float64 `json:"rating" binding:"required"`
		CustomTitle string  `json:"customTitle" binding:"required"`
		IsDocu      string  `json:"isDocu" binding:"required"`
	}
	
	// get metadata
	var metadata Metadata
	if err := c.ShouldBind(&metadata); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse metadata: %s", err.Error())})
		return
	}

	// get file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to get file: %s", err.Error())})
		return
	}
	defer file.Close()

	// destination
	// dst := filepath.Join(metadata.IsDocu == "true" && utils.MOVIES_DOCU_DIR : utils.MOVIES_DIR, metadata.CustomTitle)
	var dst string
	if metadata.IsDocu == "true" {
		dst = filepath.Join(utils.MOVIES_DOCU_DIR, metadata.CustomTitle)
	} else {
		dst = filepath.Join(utils.MOVIES_DIR, metadata.CustomTitle)
	}

	out, err := os.Create(dst)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create file: %s", err.Error())})
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to write file: %s", err.Error())})
		return
	}

	// Build minimal movie object for client response and/or DB
	movie := utils.Movie{
		ID:          primitive.NewObjectID(),
		FilePath:    dst,
		Date:        primitive.NewDateTimeFromTime(time.Now()),
		Format:      filepath.Ext(dst),
		ImdbID:      metadata.ImdbID,
		TmdbID:      metadata.TmdbID,
		Title:       metadata.Title,
		Poster:      metadata.Poster,
		Rating:      metadata.Rating,
		CustomTitle: metadata.CustomTitle,
	}

	// Insert movie into DB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := utils.GetCollection("movies").InsertOne(ctx, movie); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Respond immediately
	c.JSON(http.StatusOK, gin.H{
		"url":   fmt.Sprintf("http://localhost:8080/uploads/%s", header.Filename),
		"movie": movie,
	})
}

// GET /movies
func GetMovies(c *gin.Context) {
	// Lecture du body JSON
	var query utils.MovieQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if query.Genre != "" {
		filter["genre"] = query.Genre
	}
	if query.Title != "" {
		// Recherche insensible à la casse et partielle
		filter["title"] = bson.M{
			"$regex":   query.Title,
			"$options": "i",
		}
	}

	// Par défaut, trie par date décroissante
	sort := bson.D{{Key: "date", Value: -1}}
	if query.OrderBy != "" {
		orderParts := strings.Split(query.OrderBy, ":")
		if len(orderParts) == 2 {
			field := orderParts[0]
			dir := -1
			if strings.ToLower(orderParts[1]) == "asc" {
				dir = 1
			}
			sort = bson.D{{Key: field, Value: dir}}
		}
	}

	limit := int64(50)
	if query.Limit > 0 {
		limit = int64(query.Limit)
	}

	opts := options.Find().SetSort(sort).SetLimit(limit)

	cursor, err := utils.GetCollection("movies").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var movies []utils.Movie
	if err := cursor.All(ctx, &movies); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movies)
}

// GET /all_movies
func GetAllMovies(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := utils.GetCollection("movies").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var movies []utils.Movie
	if err := cursor.All(ctx, &movies); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movies)
}

// GET /movie/:id
func GetMovieByID(c *gin.Context) {
	tmdbID := c.Param("id")
	idInt, _ := strconv.Atoi(tmdbID)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Récupérer le film dans la base de données
	var movie utils.Movie
	err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Film non trouvé", "id": tmdbID})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		}
		return
	}

	c.JSON(http.StatusOK, movie)
}
