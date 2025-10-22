package main

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"gin/tmdb"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// POST /series - Create or get a series from TMDB
func CreateSeries(c *gin.Context) {
	var req struct {
		TmdbID int `json:"tmdbID" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if series already exists
	var existing Series
	err := GetCollection("series").FindOne(ctx, bson.M{"tmdbID": req.TmdbID}).Decode(&existing)
	if err == nil {
		// Series already exists
		c.JSON(http.StatusOK, existing)
		return
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// Fetch from TMDB
	seriesDetails, err := tmdb.FetchSeries(req.TmdbID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch series from TMDB: " + err.Error()})
		return
	}

	// Parse dates
	firstAirDate, _ := tmdb.ParseDate(seriesDetails.FirstAirDate)
	lastAirDate, _ := tmdb.ParseDate(seriesDetails.LastAirDate)

	// Create series
	series := Series{
		ID:           primitive.NewObjectID(),
		Title:        seriesDetails.Name,
		TmdbID:       seriesDetails.ID,
		ImdbID:       seriesDetails.ExternalIDs.ImdbID,
		Poster:       seriesDetails.PosterPath,
		Backdrop:     seriesDetails.BackdropPath,
		Overview:     seriesDetails.Overview,
		FirstAirDate: primitive.NewDateTimeFromTime(firstAirDate),
		LastAirDate:  primitive.NewDateTimeFromTime(lastAirDate),
		Status:       seriesDetails.Status,
		SeasonCount:  seriesDetails.NumSeasons,
		EpisodeCount: seriesDetails.NumEpisodes,
		Date:         primitive.NewDateTimeFromTime(time.Now()),
	}

	_, err = GetCollection("series").InsertOne(ctx, series)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create series: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, series)
}

// GET /series - Get all series
func GetAllSeries(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	cursor, err := GetCollection("series").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch series"})
		return
	}
	defer cursor.Close(ctx)

	var seriesList []Series
	if err := cursor.All(ctx, &seriesList); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode series"})
		return
	}

	c.JSON(http.StatusOK, seriesList)
}

// GET /series/:id - Get series by ID with episodes
func GetSeriesByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid series ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var series Series
	err = GetCollection("series").FindOne(ctx, bson.M{"_id": objID}).Decode(&series)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Series not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Get all episodes for this series
	cursor, err := GetCollection("episodes").Find(ctx, bson.M{"seriesID": objID}, options.Find().SetSort(bson.D{{Key: "seasonNumber", Value: 1}, {Key: "episodeNumber", Value: 1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch episodes"})
		return
	}
	defer cursor.Close(ctx)

	var episodes []Episode
	if err := cursor.All(ctx, &episodes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode episodes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"series":   series,
		"episodes": episodes,
	})
}

// POST /series/:id/episodes - Add episode to series
func AddEpisodeToSeries(c *gin.Context) {
	seriesIDStr := c.Param("id")
	seriesID, err := primitive.ObjectIDFromHex(seriesIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid series ID"})
		return
	}

	var req struct {
		SeriesTmdbID  int    `json:"seriesTmdbID" binding:"required"`
		SeasonNumber  int    `json:"seasonNumber" binding:"required"`
		EpisodeNumber int    `json:"episodeNumber" binding:"required"`
		FilePath      string `json:"filePath" binding:"required"`
		CustomTitle   string `json:"customTitle"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Verify series exists
	var series Series
	err = GetCollection("series").FindOne(ctx, bson.M{"_id": seriesID}).Decode(&series)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Series not found"})
		return
	}

	// Fetch episode details from TMDB
	episodeDetails, err := tmdb.FetchEpisode(req.SeriesTmdbID, req.SeasonNumber, req.EpisodeNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch episode from TMDB: " + err.Error()})
		return
	}

	airDate, _ := tmdb.ParseDate(episodeDetails.AirDate)

	// Create episode
	episode := Episode{
		ID:            primitive.NewObjectID(),
		SeriesID:      seriesID,
		TmdbID:        episodeDetails.ID,
		EpisodeNumber: episodeDetails.EpisodeNumber,
		SeasonNumber:  episodeDetails.SeasonNumber,
		Title:         episodeDetails.Name,
		Overview:      episodeDetails.Overview,
		StillPath:     episodeDetails.StillPath,
		AirDate:       primitive.NewDateTimeFromTime(airDate),
		Runtime:       episodeDetails.Runtime,
		FilePath:      req.FilePath,
		Format:        filepath.Ext(req.FilePath),
		CustomTitle:   req.CustomTitle,
		Date:          primitive.NewDateTimeFromTime(time.Now()),
	}

	_, err = GetCollection("episodes").InsertOne(ctx, episode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create episode: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, episode)
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

	var episode Episode
	err = GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&episode)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Get series info
	var series Series
	GetCollection("series").FindOne(ctx, bson.M{"_id": episode.SeriesID}).Decode(&series)

	// Get adjacent episodes for navigation
	var prevEpisode, nextEpisode Episode
	GetCollection("episodes").FindOne(ctx, bson.M{
		"seriesID": episode.SeriesID,
		"$or": []bson.M{
			{"seasonNumber": episode.SeasonNumber, "episodeNumber": episode.EpisodeNumber - 1},
			{"seasonNumber": episode.SeasonNumber - 1, "episodeNumber": bson.M{"$exists": true}},
		},
	}, options.FindOne().SetSort(bson.D{{Key: "seasonNumber", Value: -1}, {Key: "episodeNumber", Value: -1}})).Decode(&prevEpisode)

	GetCollection("episodes").FindOne(ctx, bson.M{
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

// GET /video/episode/:id - Stream episode video
func EpisodeStreamHandler(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var episode Episode
	err = GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&episode)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Get video file path
	videoFile := episode.FilePath
	if videoFile == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video file not found"})
		return
	}

	// Check if file exists
	if _, err := os.Stat(videoFile); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video file does not exist"})
		return
	}

	// Stream video (reuse existing streaming logic)
	serveVideoStream(videoFile, c)
}

// POST /ongoing_episodes - Update episode progress
func UpdateOnGoingEpisode(c *gin.Context) {
	var onGoingEpisode OnGoingEpisode
	if err := c.ShouldBindJSON(&onGoingEpisode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"user":    onGoingEpisode.UserID,
		"episode": onGoingEpisode.EpisodeID,
	}

	var existing OnGoingEpisode
	errFind := GetCollection("ongoing_episodes").FindOne(ctx, filter).Decode(&existing)
	if errFind == nil {
		onGoingEpisode.ID = existing.ID
	} else if errFind != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + errFind.Error()})
		return
	} else {
		onGoingEpisode.ID = primitive.NewObjectID()
	}

	updateOptions := options.Update().SetUpsert(true)
	idFilter := bson.M{"_id": onGoingEpisode.ID}
	update := bson.M{"$set": onGoingEpisode}

	_, err := GetCollection("ongoing_episodes").UpdateOne(ctx, idFilter, update, updateOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// Update user's ongoing episodes list
	usersCol := GetCollection("users")

	// Remove if exists
	usersCol.UpdateOne(
		ctx,
		bson.M{"_id": onGoingEpisode.UserID},
		bson.M{"$pull": bson.M{"onGoingEpisodes": onGoingEpisode.ID}},
	)

	// Push to position 0
	usersCol.UpdateOne(
		ctx,
		bson.M{"_id": onGoingEpisode.UserID},
		bson.M{
			"$push": bson.M{
				"onGoingEpisodes": bson.M{
					"$each":     bson.A{onGoingEpisode.ID},
					"$position": 0,
				},
			},
		},
	)

	c.JSON(http.StatusOK, onGoingEpisode)
}

// GET /ongoing_episodes/:id - Get episode progress
func GetOnGoingEpisodeByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var onGoingEpisode OnGoingEpisode
	err = GetCollection("ongoing_episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&onGoingEpisode)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode progress not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	c.JSON(http.StatusOK, onGoingEpisode)
}

// DELETE /ongoing_episodes/:id - Delete episode progress
func DeleteOnGoingEpisode(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Delete ongoing episode
	delRes, err := GetCollection("ongoing_episodes").DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete: " + err.Error()})
		return
	}

	if delRes.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode progress not found"})
		return
	}

	// Remove from users
	GetCollection("users").UpdateMany(
		ctx,
		bson.M{"onGoingEpisodes": objID},
		bson.M{"$pull": bson.M{"onGoingEpisodes": objID}},
	)

	c.JSON(http.StatusOK, gin.H{"message": "Episode progress deleted", "deleted": delRes.DeletedCount})
}
