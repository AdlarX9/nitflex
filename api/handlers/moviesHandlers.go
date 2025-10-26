package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"api/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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

// POST /movies - multipart upload endpoint
// Minimal DB maintenance then trigger pipeline
func UploadMovie(c *gin.Context) {
    // metadata
    customTitle := c.PostForm("customTitle")
    tmdbIDStr := c.PostForm("tmdbID")
    mediaType := c.PostForm("type")             // "movie" | "series"
    transcodeMode := c.PostForm("transcodeMode") // may be empty => default in pipeline

    if customTitle == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "customTitle is required"})
        return
    }

    // file
    file, header, err := c.Request.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to get file: %s", err.Error())})
        return
    }
    defer file.Close()

    // destination
    dst := filepath.Join(".", "uploads", customTitle)
    // For series uploads, ensure unique temp filename using source extension to avoid collisions
    if mediaType == "series" {
        ext := filepath.Ext(header.Filename)
        if ext == "" {
            ext = ".mp4"
        }
        base := strings.TrimSuffix(header.Filename, ext)
        if base == "" {
            base = customTitle
        }
        unique := fmt.Sprintf("%s_%d%s", sanitizeName(base), time.Now().UnixNano(), ext)
        dst = filepath.Join(".", "uploads", unique)
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
        CustomTitle: customTitle,
        FilePath:    dst,
        Date:        primitive.NewDateTimeFromTime(time.Now()),
        Format:      filepath.Ext(dst),
    }

    if mediaType != "series" {
        // Parse tmdbID for movies
        if tmdbIDStr == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "tmdbID is required for movies"})
            return
        }
        if id, err := strconv.Atoi(tmdbIDStr); err == nil {
            movie.TmdbID = id
        }
    }

    // If it's an episode upload, skip inserting into movies
    if mediaType == "series" {
        c.JSON(http.StatusOK, gin.H{
            "url":   fmt.Sprintf("http://localhost:8080/uploads/%s", header.Filename),
            "movie": movie,
        })
        return
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

    // Trigger pipeline AFTER response
    go func(m utils.Movie) {
        _ = utils.StartMoviePipeline(m.ID, m.TmdbID, m.FilePath, transcodeMode, nil)
    }(movie)
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

// sanitizeName performs minimal filename sanitization for temp uploads
func sanitizeName(name string) string {
    n := strings.TrimSpace(name)
    replacers := []string{"/", "_", "\\", "_", ":", " - ", "*", "-", "?", "", "\"", "", "'", "", "<", "", ">", "", "|", "-"}
    for i := 0; i+1 < len(replacers); i += 2 {
        n = strings.ReplaceAll(n, replacers[i], replacers[i+1])
    }
    if n == "" {
        n = "untitled"
    }
    return n
}
