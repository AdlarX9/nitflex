package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"
	"api/utils"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// POST /series - Create series with minimal info
func CreateSeries(c *gin.Context) {
	var req struct {
		Title       string `json:"title" binding:"required"`
		TmdbID      int    `json:"tmdbID" binding:"required"`
		ImdbID      string `json:"imdbID" binding:"required"`
		Poster      string `json:"poster" binding:"required"`
		CustomTitle string `json:"customTitle"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if series already exists
	var existing utils.Series
	err := utils.GetCollection("series").FindOne(ctx, bson.M{"tmdbID": req.TmdbID}).Decode(&existing)
	if err == nil {
		c.JSON(http.StatusOK, existing)
		return
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	series := utils.Series{
		ID:          primitive.NewObjectID(),
		Title:       req.Title,
		TmdbID:      req.TmdbID,
		ImdbID:      req.ImdbID,
		Poster:      req.Poster,
		CustomTitle: req.CustomTitle,
		Date:        primitive.NewDateTimeFromTime(time.Now()),
	}

	if _, err := utils.GetCollection("series").InsertOne(ctx, series); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create series: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, series)
}

// PATCH /series/:id - Update series fields (currently supports customTitle)
func UpdateSeries(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid series ID"})
		return
	}

	var req struct {
		CustomTitle string `json:"customTitle"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	update := bson.M{}
	if req.CustomTitle != "" {
		update["customTitle"] = req.CustomTitle
	}

	if len(update) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := utils.GetCollection("series").UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": update}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update series"})
		return
	}

	var updated utils.Series
	if err := utils.GetCollection("series").FindOne(ctx, bson.M{"_id": objID}).Decode(&updated); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated series"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// POST /series/:id/episodes - Add episode (minimal info) then trigger pipeline
func AddEpisodeToSeries(c *gin.Context) {
	seriesIDStr := c.Param("id")
	seriesID, err := primitive.ObjectIDFromHex(seriesIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid series ID"})
		return
	}

	var req struct {
		SeasonNumber  int    `json:"seasonNumber" binding:"required"`
		EpisodeNumber int    `json:"episodeNumber" binding:"required"`
		FilePath      string `json:"filePath" binding:"required"`
		CustomTitle   string `json:"customTitle"`
		Title         string `json:"title"`
		TmdbID        int    `json:"tmdbID"`
		TranscodeMode string `json:"transcodeMode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Build episode doc
	title := req.Title
	if title == "" {
		if req.CustomTitle != "" {
			title = req.CustomTitle
		} else {
			title = fmt.Sprintf("S%02dE%02d", req.SeasonNumber, req.EpisodeNumber)
		}
	}

	episode := utils.Episode{
		ID:            primitive.NewObjectID(),
		SeriesID:      seriesID,
		SeasonNumber:  req.SeasonNumber,
		EpisodeNumber: req.EpisodeNumber,
		Title:         title,
		FilePath:      req.FilePath,
		CustomTitle:   req.CustomTitle,
		TmdbID:        req.TmdbID,
		Date:          primitive.NewDateTimeFromTime(time.Now()),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := utils.GetCollection("episodes").InsertOne(ctx, episode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create episode: " + err.Error()})
		return
	}

	// Respond first
	c.JSON(http.StatusCreated, episode)

	// Trigger pipeline asynchronously
	go func(ep utils.Episode, mode string) {
		_ = utils.StartEpisodePipeline(ep.ID, ep.TmdbID, ep.FilePath, mode, nil)
	}(episode, req.TranscodeMode)
}

// POST /series/:id/episodes/batch - Add multiple episodes at once and start pipelines
func AddEpisodesBatch(c *gin.Context) {
	seriesIDStr := c.Param("id")
	seriesID, err := primitive.ObjectIDFromHex(seriesIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid series ID"})
		return
	}

	var req struct {
		Episodes []struct {
			SeasonNumber  int    `json:"seasonNumber" binding:"required"`
			EpisodeNumber int    `json:"episodeNumber" binding:"required"`
			FilePath      string `json:"filePath" binding:"required"`
			Title         string `json:"title"`
			TmdbID        int    `json:"tmdbID"`
			TranscodeMode string `json:"transcodeMode"`
			CustomTitle   string `json:"customTitle"`
		} `json:"episodes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	created := make([]utils.Episode, 0, len(req.Episodes))
	for _, it := range req.Episodes {
		title := it.Title
		if title == "" {
			if it.CustomTitle != "" {
				title = it.CustomTitle
			} else {
				title = fmt.Sprintf("S%02dE%02d", it.SeasonNumber, it.EpisodeNumber)
			}
		}

		ep := utils.Episode{
			ID:            primitive.NewObjectID(),
			SeriesID:      seriesID,
			SeasonNumber:  it.SeasonNumber,
			EpisodeNumber: it.EpisodeNumber,
			Title:         title,
			FilePath:      it.FilePath,
			CustomTitle:   it.CustomTitle,
			TmdbID:        it.TmdbID,
			Date:          primitive.NewDateTimeFromTime(time.Now()),
		}

		if _, err := utils.GetCollection("episodes").InsertOne(ctx, ep); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create episode: " + err.Error()})
			return
		}

		created = append(created, ep)

		// Start pipeline asynchronously per episode
		go func(ep utils.Episode, mode string) {
			_ = utils.StartEpisodePipeline(ep.ID, ep.TmdbID, ep.FilePath, mode, nil)
		}(ep, it.TranscodeMode)
	}

	c.JSON(http.StatusCreated, gin.H{"episodes": created})
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
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
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

	// Get series info
	var series utils.Series
	utils.GetCollection("series").FindOne(ctx, bson.M{"_id": episode.SeriesID}).Decode(&series)

	// Get adjacent episodes for navigation
	var prevEpisode, nextEpisode utils.Episode
	utils.GetCollection("episodes").FindOne(ctx, bson.M{
		"seriesID": episode.SeriesID,
		"$or": []bson.M{
			{"seasonNumber": episode.SeasonNumber, "episodeNumber": episode.EpisodeNumber - 1},
			{"seasonNumber": episode.SeasonNumber - 1, "episodeNumber": bson.M{"$exists": true}},
		},
	}, options.FindOne().SetSort(bson.D{{Key: "seasonNumber", Value: -1}, {Key: "episodeNumber", Value: -1}})).Decode(&prevEpisode)

	utils.GetCollection("episodes").FindOne(ctx, bson.M{
		"seriesID": episode.SeriesID,
		"$or": []bson.M{
			{"seasonNumber": episode.SeasonNumber, "episodeNumber": episode.EpisodeNumber + 1},
			{"seasonNumber": episode.SeasonNumber + 1, "episodeNumber": 1},
		},
	}, options.FindOne().SetSort(bson.D{{Key: "seasonNumber", Value: 1}, {Key: "episodeNumber", Value: 1}})).Decode(&nextEpisode)

	response := gin.H{
		"episode": episode,
		"series":  series,
	}

	if prevEpisode.ID != primitive.NilObjectID {
		response["prevEpisode"] = prevEpisode
	}
	if nextEpisode.ID != primitive.NilObjectID {
		response["nextEpisode"] = nextEpisode
	}

	c.JSON(http.StatusOK, response)
}
