package main

import (
	"context"
	"net/http"
	"time"

	"gin/jobs"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var jobQueue *jobs.Queue

// InitJobQueue initializes the global job queue
func InitJobQueue(workers int) {
	jobQueue = jobs.NewQueue(GetDatabase(), workers)
	jobQueue.Start()
}

// StopJobQueue gracefully stops the job queue
func StopJobQueue() {
	if jobQueue != nil {
		jobQueue.Stop()
	}
}

// POST /jobs - Create a new job
func CreateJob(c *gin.Context) {
	var req struct {
		Type             string                 `json:"type" binding:"required"` // "movie" or "episode"
		MediaID          string                 `json:"mediaID"`
		TmdbID           int                    `json:"tmdbID" binding:"required"`
		InputPath        string                 `json:"inputPath" binding:"required"`
		TranscodeMode    string                 `json:"transcodeMode"` // "local", "server", "none"
		TranscodeOptions map[string]interface{} `json:"transcodeOptions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	var mediaID primitive.ObjectID
	var err error
	if req.MediaID != "" {
		mediaID, err = primitive.ObjectIDFromHex(req.MediaID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
			return
		}
	}

	if req.TranscodeMode == "" {
		req.TranscodeMode = "server"
	}

	job := Job{
		ID:               primitive.NewObjectID(),
		Type:             req.Type,
		MediaID:          mediaID,
		TmdbID:           req.TmdbID,
		Stage:            jobs.StageQueued,
		Progress:         0,
		InputPath:        req.InputPath,
		TranscodeMode:    req.TranscodeMode,
		TranscodeOptions: req.TranscodeOptions,
		CreatedAt:        primitive.NewDateTimeFromTime(time.Now()),
		UpdatedAt:        primitive.NewDateTimeFromTime(time.Now()),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = GetCollection("jobs").InsertOne(ctx, job)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job: " + err.Error()})
		return
	}

	// Enqueue the job
	if err := jobQueue.Enqueue(job.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enqueue job: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, job)
}

// GET /jobs - List user's jobs
func GetJobs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Get recent jobs (last 50)
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50)
	cursor, err := GetCollection("jobs").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch jobs"})
		return
	}
	defer cursor.Close(ctx)

	var jobsList []Job
	if err := cursor.All(ctx, &jobsList); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode jobs"})
		return
	}

	c.JSON(http.StatusOK, jobsList)
}

// GET /jobs/:id - Get job details
func GetJobByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var job Job
	err = GetCollection("jobs").FindOne(ctx, bson.M{"_id": objID}).Decode(&job)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// POST /jobs/:id/cancel - Cancel a job
func CancelJob(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	if err := jobQueue.CancelJob(objID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel job: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job canceled"})
}

// GET /jobs/stream - SSE endpoint for real-time job updates
func StreamJobs(c *gin.Context) {
	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// Subscribe to job updates
	updateChan := jobQueue.Subscribe()
	defer jobQueue.Unsubscribe(updateChan)

	// Send initial connection message
	c.SSEvent("connected", gin.H{"message": "Connected to job stream"})
	c.Writer.Flush()

	// Stream updates
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case update := <-updateChan:
			// Send update to client
			c.SSEvent("job-update", update)
			c.Writer.Flush()
		case <-ticker.C:
			// Send keepalive
			c.SSEvent("keepalive", gin.H{"time": time.Now().Unix()})
			c.Writer.Flush()
		}
	}
}

// DELETE /jobs/:id - Delete a completed job
func DeleteJob(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Only allow deleting completed, failed, or canceled jobs
	result, err := GetCollection("jobs").DeleteOne(ctx, bson.M{
		"_id": objID,
		"stage": bson.M{
			"$in": []string{jobs.StageCompleted, jobs.StageFailed, jobs.StageCanceled},
		},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete job"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found or cannot be deleted"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job deleted"})
}

// Helper to update job progress (can be called from transcoding pipeline)
func UpdateJobProgress(jobID primitive.ObjectID, stage string, progress float64, eta int, errorMsg string) error {
	ctx := context.Background()

	update := bson.M{
		"stage":     stage,
		"progress":  progress,
		"updatedAt": primitive.NewDateTimeFromTime(time.Now()),
	}

	if eta > 0 {
		update["eta"] = eta
	}

	if errorMsg != "" {
		update["errorMessage"] = errorMsg
		update["stage"] = jobs.StageFailed
	}

	if stage == jobs.StageCompleted || stage == jobs.StageFailed || stage == jobs.StageCanceled {
		update["completedAt"] = primitive.NewDateTimeFromTime(time.Now())
	}

	_, err := GetCollection("jobs").UpdateOne(
		ctx,
		bson.M{"_id": jobID},
		bson.M{"$set": update},
	)

	return err
}
