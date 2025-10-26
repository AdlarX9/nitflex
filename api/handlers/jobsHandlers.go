package handlers

import (
	"context"
	"net/http"
	"time"
	"api/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GET /jobs - List user's jobs
func GetJobs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Get recent jobs (last 50)
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50)
	cursor, err := utils.GetCollection("jobs").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch jobs"})
		return
	}
	defer cursor.Close(ctx)

	var jobsList []utils.Job
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

	var job utils.Job
	err = utils.GetCollection("jobs").FindOne(ctx, bson.M{"_id": objID}).Decode(&job)
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

	if err := utils.CancelJob(objID); err != nil {
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
	updateChan := utils.SubscribeJobUpdates()
	defer utils.UnsubscribeJobUpdates(updateChan)

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
	result, err := utils.GetCollection("jobs").DeleteOne(ctx, bson.M{
		"_id": objID,
		"stage": bson.M{
			"$in": []string{utils.StageCompleted, utils.StageFailed, utils.StageCanceled},
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
