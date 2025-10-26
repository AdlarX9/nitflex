package utils

import (
    "context"
    "fmt"
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

// Job orchestration moved here: queue init and pipeline entrypoints

var jobQueue *Queue

// InitJobQueue initializes the global job queue
func InitJobQueue(workers int) {
    jobQueue = NewQueue(GetDatabase(), workers)
    jobQueue.Start()
}

// StopJobQueue gracefully stops the job queue
func StopJobQueue() {
    if jobQueue != nil {
        jobQueue.Stop()
    }
}

// SubscribeJobUpdates returns a channel of job updates for SSE
func SubscribeJobUpdates() chan JobUpdate {
    return jobQueue.Subscribe()
}

// UnsubscribeJobUpdates removes a listener
func UnsubscribeJobUpdates(ch chan JobUpdate) {
    if jobQueue != nil {
        jobQueue.Unsubscribe(ch)
    }
}

// CancelJob cancels a running job
func CancelJob(jobID primitive.ObjectID) error {
    if jobQueue == nil {
        return fmt.Errorf("job queue not initialized")
    }
    return jobQueue.CancelJob(jobID)
}

// StartMoviePipeline creates a job for a movie and enqueues it
func StartMoviePipeline(movieID primitive.ObjectID, tmdbID int, inputPath, transcodeMode string, transcodeOptions map[string]interface{}) error {
    return createAndEnqueueJob("movie", movieID, tmdbID, inputPath, transcodeMode, transcodeOptions)
}

// StartEpisodePipeline creates a job for a series episode and enqueues it
func StartEpisodePipeline(episodeID primitive.ObjectID, tmdbID int, inputPath, transcodeMode string, transcodeOptions map[string]interface{}) error {
    return createAndEnqueueJob("episode", episodeID, tmdbID, inputPath, transcodeMode, transcodeOptions)
}

func createAndEnqueueJob(jtype string, mediaID primitive.ObjectID, tmdbID int, inputPath, transcodeMode string, transcodeOptions map[string]interface{}) error {
    if transcodeMode == "" {
        transcodeMode = "server"
    }

    job := Job{
        ID:               primitive.NewObjectID(),
        Type:             jtype,
        MediaID:          mediaID,
        TmdbID:           tmdbID,
        Stage:            StageQueued,
        Progress:         0,
        InputPath:        inputPath,
        TranscodeMode:    transcodeMode,
        TranscodeOptions: transcodeOptions,
        CreatedAt:        primitive.NewDateTimeFromTime(time.Now()),
        UpdatedAt:        primitive.NewDateTimeFromTime(time.Now()),
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if _, err := GetCollection("jobs").InsertOne(ctx, job); err != nil {
        return fmt.Errorf("failed to create job: %w", err)
    }

    if err := jobQueue.Enqueue(job.ID); err != nil {
        return fmt.Errorf("failed to enqueue job: %w", err)
    }

    return nil
}
