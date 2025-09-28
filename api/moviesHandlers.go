package main

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Task struct {
	Status string
	Output string
}

var (
	tasks = make([]*Task, 0) // Slice pour stocker les tâches
	mu    sync.Mutex         // Mutex pour éviter les conflits d'accès
)

// POST /ongoing_movies
func UpdateOnGoingMovie(c *gin.Context) {
	var onGoingMovie OnGoingMovie
	if err := c.ShouldBindJSON(&onGoingMovie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Ajout de l'option upsert
	updateOptions := options.Update().SetUpsert(true)

	_, err := GetCollection("ongoing_movies").UpdateOne(
		ctx,
		bson.M{"_id": onGoingMovie.ID},
		bson.M{"$set": onGoingMovie},
		updateOptions,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, onGoingMovie)
}

// DELETE /ongoing_movies/:id
func DeleteOnGoingMovie(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID invalide"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := GetCollection("ongoing_movies").DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil || res.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Suppression impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": res.DeletedCount})
}

// GET /movies
func GetMovies(c *gin.Context) {
	// Lecture du body JSON
	var query MovieQuery
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

	cursor, err := GetCollection("movies").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var movies []Movie
	if err := cursor.All(ctx, &movies); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movies)
}

func GetAllMovies(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := GetCollection("movies").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var movies []Movie
	if err := cursor.All(ctx, &movies); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movies)
}

// GET /movie/:id
func GetMovieByID(c *gin.Context) {
	tmdbID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Récupérer le film dans la base de données
	var movie Movie
	err := GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": parseInt(tmdbID)}).Decode(&movie)
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