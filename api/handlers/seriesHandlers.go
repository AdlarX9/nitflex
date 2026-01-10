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

type EpisodeMeta struct {
	FileName      string `json:"fileName" binding:"required"`
	Index         int    `json:"index" binding:"required"`
	Title         string `json:"title" binding:"required"`
	SeasonNumber  int    `json:"seasonNumber" binding:"required"`
	EpisodeNumber int    `json:"episodeNumber" binding:"required"`
}

type Metadata struct {
	TmdbID      int           `json:"tmdbID" binding:"required"`
	Title       string        `json:"title" binding:"required"`
	Poster      string        `json:"poster" binding:"required"`
	IsDocu      string        `json:"isDocu" binding:"required"`
	IsKids      string        `json:"isKids" binding:"required"`
	CustomTitle string        `json:"customTitle" binding:"required"`
	Episodes    []EpisodeMeta `json:"episodes"`
}

// POST /series
func CreateSeries(c *gin.Context) {
	// get metadata
	var metadata Metadata
	if err := c.ShouldBind(&metadata); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid metadata: " + err.Error()})
		return
	}
	episodesJSON := c.PostForm("EpisodesJSON")
	if episodesJSON != "" {
		if err := json.Unmarshal([]byte(episodesJSON), &metadata.Episodes); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid episodes JSON: " + err.Error()})
			return
		}
	}

	// get form
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid multipart form: " + err.Error()})
		return
	}

	// get files
	files := form.File["files[]"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files provided"})
		return
	}

	// security
	if len(metadata.Episodes) != len(files) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "episodes and files length mismatch"})
		return
	}

	// Find or create series by tmdbID
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var series utils.Series
	if findErr := utils.GetCollection("series").FindOne(ctx, bson.M{"tmdbID": metadata.TmdbID}).Decode(&series); findErr != nil {
		if findErr != mongo.ErrNoDocuments {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database error: " + findErr.Error()})
			return
		}

		// Create new series
		series = utils.Series{
			ID:          primitive.NewObjectID(),
			Title:       firstNonEmpty(metadata.Title, fmt.Sprintf("Series %d", metadata.TmdbID)),
			CustomTitle: strings.TrimSpace(metadata.CustomTitle),
			TmdbID:      metadata.TmdbID,
			Poster:      metadata.Poster,
			Date:        primitive.NewDateTimeFromTime(time.Now()),
		}
		if _, err := utils.GetCollection("series").InsertOne(ctx, series); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create series: " + err.Error()})
			return
		}
	}

	// Iterate files in order, match with epMetas by index
	for index, fileheader := range files {
		meta := metadata.Episodes[index]

		// sanity check
		if meta.SeasonNumber <= 0 || meta.EpisodeNumber <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid season/episode for file %d", index)})
			return
		}

		// Save temp file
		src, err := fileheader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to open file %s: %v", fileheader.Filename, err)})
			return
		}
		defer src.Close()

		// get dst
		dst, err := getDstForEpisode(meta, metadata, series)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get destination path: %v", err)})
			return
		}

		// save file
		out, err := os.Create(dst)
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

		// save episode in db
		ep := utils.Episode{
			ID:            primitive.NewObjectID(),
			TmdbID:        series.TmdbID,
			EpisodeNumber: meta.EpisodeNumber,
			SeasonNumber:  meta.SeasonNumber,
			SeriesID:      series.ID,
			Title:         meta.Title,
			FilePath:      dst,
			Date:          primitive.NewDateTimeFromTime(time.Now()),
		}

		if _, err := utils.GetCollection("episodes").InsertOne(ctx, ep); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create episode: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{"status": "ok"})
}

func getDstForEpisode(meta EpisodeMeta, metadata Metadata, series utils.Series) (string, error) {
	// get ext
	ext := strings.ToLower(filepath.Ext(meta.FileName))
	if ext == "" {
		ext = ".mp4"
	}

	// get destination folder
	fileName := fmt.Sprintf("%02d%02d - %s%s", meta.SeasonNumber, meta.EpisodeNumber, sanitizeName(meta.Title), ext)
	var serieFolder string
	if metadata.IsDocu == "true" {
		serieFolder = filepath.Join(utils.SERIES_DOCU_DIR, series.CustomTitle)
	} else if metadata.IsKids == "true" {
		serieFolder = filepath.Join(utils.SERIES_KID_DIR, series.CustomTitle)
	} else {
		serieFolder = filepath.Join(utils.SERIES_DIR, series.CustomTitle)
	}

	var dst string

	// set hasExistingFiles
	entries, err := os.ReadDir(serieFolder)
	hasExistingFiles := err == nil && len(entries) > 0
	fileCount := 0
	if hasExistingFiles {
		for _, entry := range entries {
			if !entry.IsDir() {
				fileCount++
			}
		}
		hasExistingFiles = fileCount > 0
	}

	if hasExistingFiles {
		if meta.SeasonNumber <= 1 {
			// Saison 1 : fichier directement dans serieFolder
			dst = filepath.Join(serieFolder, fileName)
		} else {
			season1Dir := filepath.Join(serieFolder, "Saison 1")
			if err := os.MkdirAll(season1Dir, 0755); err != nil {
				return "", err
			}

			// move everything into Saison 1
			for _, entry := range entries {
				if !entry.IsDir() {
					oldPath := filepath.Join(serieFolder, entry.Name())
					newPath := filepath.Join(season1Dir, entry.Name())
					if err := os.Rename(oldPath, newPath); err != nil {
						return "", err
					}
				}
			}

			// copy new file into Saison [X]
			seasonDir := filepath.Join(serieFolder, fmt.Sprintf("Saison %d", meta.SeasonNumber))
			if err := os.MkdirAll(seasonDir, 0755); err != nil {
				return "", err
			}
			dst = filepath.Join(seasonDir, fileName)
		}
	} else {
		// Pas de fichiers existants :  directement dans Saison [X]
		seasonDir := filepath.Join(serieFolder, fmt.Sprintf("Saison %d", meta.SeasonNumber))
		if err := os.MkdirAll(seasonDir, 0755); err != nil {
			return "", err
		}
		dst = filepath.Join(seasonDir, fileName)
	}

	return dst, nil
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

	// Build prev/next within same series (prefer same season, otherwise cross-season)
	coll := utils.GetCollection("episodes")

	var nextEp utils.Episode
	nextFound := false
	// 1) next in same season (min episodeNumber > current)
	nextFilterSame := bson.M{
		"seriesID":      episode.SeriesID,
		"seasonNumber":  episode.SeasonNumber,
		"episodeNumber": bson.M{"$gt": episode.EpisodeNumber},
	}
	if err := coll.FindOne(ctx, nextFilterSame, options.FindOne().SetSort(bson.D{{Key: "episodeNumber", Value: 1}})).Decode(&nextEp); err == nil {
		nextFound = true
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	} else {
		// 2) next season: take the first episode of the nearest higher season
		nextFilterCross := bson.M{"seriesID": episode.SeriesID, "seasonNumber": bson.M{"$gt": episode.SeasonNumber}}
		if err2 := coll.FindOne(ctx, nextFilterCross, options.FindOne().SetSort(bson.D{{Key: "seasonNumber", Value: 1}, {Key: "episodeNumber", Value: 1}})).Decode(&nextEp); err2 == nil {
			nextFound = true
		} else if err2 != mongo.ErrNoDocuments {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
	}

	// Compose response: flatten episode fields and attach prev/next
	var resp map[string]interface{}
	// marshal then unmarshal to map
	if b, err := json.Marshal(episode); err == nil {
		_ = json.Unmarshal(b, &resp)
	}
	if resp == nil {
		resp = map[string]interface{}{}
	}
	if nextFound {
		resp["nextEpisode"] = nextEp
	}
	c.JSON(http.StatusOK, resp)
}
