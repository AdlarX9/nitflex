package handlers

import (
	"api/utils"
	"context"
	"encoding/json"
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

// POST /series - Create series with minimal info
func CreateSeries(c *gin.Context) {
	// Expect a multipart form with:
	// - files[]: multiple video files
	// - tmdbID: series TMDB id (required)
	// - title, imdbID, poster: optional (used only when creating a new series)
	// - folderName: optional custom folder name (ignored if series already exists)
	// - transcodeMode: optional (default handled in pipeline)
	// - episodes: JSON array mapping each file to season/episode
	//   e.g. [{"index":0,"seasonNumber":1,"episodeNumber":1}, ...]

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid multipart form: " + err.Error()})
		return
	}

	get := func(key string) string {
		if v, ok := form.Value[key]; ok && len(v) > 0 {
			return v[0]
		}
		return ""
	}

	tmdbStr := get("tmdbID")
	if tmdbStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tmdbID is required"})
		return
	}
	tmdbID, _ := strconv.Atoi(tmdbStr)
	title := get("title")
	imdbID := get("imdbID")
	poster := get("poster")
	folderName := get("folderName")
	transcodeMode := get("transcodeMode")
	episodesJSON := get("episodes")

	type EpMeta struct {
		Index         int `json:"index"`
		SeasonNumber  int `json:"seasonNumber"`
		EpisodeNumber int `json:"episodeNumber"`
	}
	var epMetas []EpMeta
	if episodesJSON != "" {
		if err := json.Unmarshal([]byte(episodesJSON), &epMetas); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid episodes payload: " + err.Error()})
			return
		}
	}

	files := form.File["files[]"]
	if len(files) == 0 {
		files = form.File["files"]
	}
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files provided"})
		return
	}

	// Align epMetas length to files if needed
	if len(epMetas) != len(files) {
		// build default mapping by order if not provided
		if len(epMetas) == 0 {
			epMetas = make([]EpMeta, len(files))
			for i := range files {
				epMetas[i] = EpMeta{Index: i, SeasonNumber: 1, EpisodeNumber: i + 1}
			}
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "episodes and files length mismatch"})
			return
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Find or create series by tmdbID
	var series utils.Series
	findErr := utils.GetCollection("series").FindOne(ctx, bson.M{"tmdbID": tmdbID}).Decode(&series)
	if findErr != nil {
		if findErr != mongo.ErrNoDocuments {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database error: " + findErr.Error()})
			return
		}
		// Create new series
		series = utils.Series{
			ID:          primitive.NewObjectID(),
			Title:       firstNonEmpty(title, fmt.Sprintf("Series %d", tmdbID)),
			CustomTitle: strings.TrimSpace(folderName),
			TmdbID:      tmdbID,
			ImdbID:      imdbID,
			Poster:      poster,
			Date:        primitive.NewDateTimeFromTime(time.Now()),
		}
		if _, err := utils.GetCollection("series").InsertOne(ctx, series); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create series: " + err.Error()})
			return
		}
	} else {
		// Existing series: ignore folderName and keep as is
	}

	// Ensure temp uploads dir exists
	if err := os.MkdirAll("./uploads", 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare temp dir: " + err.Error()})
		return
	}

	created := make([]utils.Episode, 0, len(files))

	// Iterate files in order, match with epMetas by index
	for i, fh := range files {
		meta := epMetas[i]
		if meta.SeasonNumber <= 0 || meta.EpisodeNumber <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid season/episode for file %d", i)})
			return
		}

		// Save temp file
		src, err := fh.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to open file %s: %v", fh.Filename, err)})
			return
		}
		defer src.Close()

		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if ext == "" {
			ext = ".mp4"
		}
		base := strings.TrimSuffix(fh.Filename, ext)
		if base == "" {
			base = fmt.Sprintf("S%02dE%02d", meta.SeasonNumber, meta.EpisodeNumber)
		}
		tempName := fmt.Sprintf("%s_%d%s", sanitizeName(base), time.Now().UnixNano(), ext)
		dstPath := filepath.Join("./uploads", tempName)

		out, err := os.Create(dstPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create temp file: %v", err)})
			return
		}
		if _, err := io.Copy(out, src); err != nil {
			out.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to write temp file: %v", err)})
			return
		}
		out.Close()

		// Create episode doc
		epTitle := fmt.Sprintf("S%02dE%02d", meta.SeasonNumber, meta.EpisodeNumber)
		ep := utils.Episode{
			ID:            primitive.NewObjectID(),
			TmdbID:        tmdbID,
			EpisodeNumber: meta.EpisodeNumber,
			SeasonNumber:  meta.SeasonNumber,
			SeriesID:      series.ID,
			Title:         epTitle,
			FilePath:      dstPath,
			Date:          primitive.NewDateTimeFromTime(time.Now()),
		}

		if _, err := utils.GetCollection("episodes").InsertOne(ctx, ep); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create episode: " + err.Error()})
			return
		}
		created = append(created, ep)

		// Start pipeline (async)
		go func(ep utils.Episode) {
			_ = utils.StartEpisodePipeline(ep.ID, ep.TmdbID, ep.FilePath, transcodeMode, nil)
		}(ep)
	}

	c.JSON(http.StatusCreated, gin.H{"series": series, "episodes": created})
}

// sanitizeName performs minimal filename sanitization
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

func firstNonEmpty(a, b string) string {
	if strings.TrimSpace(a) != "" {
		return a
	}
	return b
}

// GET /series - Get all series
func GetAllSeries(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	cursor, err := utils.GetCollection("series").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch series"})
		return
	}
	defer cursor.Close(ctx)

	var seriesList []utils.Series
	if err := cursor.All(ctx, &seriesList); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode series"})
		return
	}

	c.JSON(http.StatusOK, seriesList)
}

// GET /series/:id - Get series by ID with episodes
func GetSeriesByID(c *gin.Context) {
	id := c.Param("id")
	idInt, _ := strconv.Atoi(id)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var series utils.Series
	err := utils.GetCollection("series").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&series)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Series not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Get all episodes for this series
	cursor, err := utils.GetCollection("episodes").Find(ctx, bson.M{"seriesID": series.ID}, options.Find().SetSort(bson.D{{Key: "seasonNumber", Value: 1}, {Key: "episodeNumber", Value: 1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch episodes"})
		return
	}
	defer cursor.Close(ctx)

	var episodes []utils.Episode
	if err := cursor.All(ctx, &episodes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode episodes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"series":   series,
		"episodes": episodes,
	})
}

// GET /episode/:id - Get episode by ID
func GetEpisodeByID(c *gin.Context) {
	id := c.Param("id")

	// Parse MongoDB ObjectID from hex
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid episode id"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var episode utils.Episode
	err = utils.GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&episode)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	c.JSON(http.StatusOK, episode)
}
