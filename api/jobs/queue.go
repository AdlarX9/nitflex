package jobs

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Job stages
const (
	StageQueued      = "queued"
	StageTranscoding = "transcoding"
	StageTagging     = "tagging"
	StageMoving      = "moving"
	StageCompleted   = "completed"
	StageFailed      = "failed"
	StageCanceled    = "canceled"
)

// JobUpdate represents a job update event
type JobUpdate struct {
	JobID    string
	Stage    string
	Progress float64
	ETA      int
	Error    string
}

// Queue manages job processing
type Queue struct {
	db              *mongo.Database
	workers         int
	jobChan         chan primitive.ObjectID
	stopChan        chan struct{}
	wg              sync.WaitGroup
	activeJobs      map[primitive.ObjectID]context.CancelFunc
	activeJobsMutex sync.RWMutex
	updateListeners []chan JobUpdate
	listenersMutex  sync.RWMutex
}

// NewQueue creates a new job queue
func NewQueue(db *mongo.Database, workers int) *Queue {
	return &Queue{
		db:              db,
		workers:         workers,
		jobChan:         make(chan primitive.ObjectID, 100),
		stopChan:        make(chan struct{}),
		activeJobs:      make(map[primitive.ObjectID]context.CancelFunc),
		updateListeners: make([]chan JobUpdate, 0),
	}
}

// Start begins processing jobs
func (q *Queue) Start() {
	log.Printf("Starting job queue with %d workers", q.workers)
	
	for i := 0; i < q.workers; i++ {
		q.wg.Add(1)
		go q.worker(i)
	}
	
	// Load pending jobs from database
	go q.loadPendingJobs()
}

// Stop gracefully stops the queue
func (q *Queue) Stop() {
	log.Println("Stopping job queue...")
	close(q.stopChan)
	q.wg.Wait()
	log.Println("Job queue stopped")
}

// Enqueue adds a job to the queue
func (q *Queue) Enqueue(jobID primitive.ObjectID) error {
	select {
	case q.jobChan <- jobID:
		log.Printf("Job %s enqueued", jobID.Hex())
		return nil
	case <-time.After(5 * time.Second):
		return fmt.Errorf("timeout enqueueing job")
	}
}

// CancelJob cancels a running job
func (q *Queue) CancelJob(jobID primitive.ObjectID) error {
	q.activeJobsMutex.Lock()
	defer q.activeJobsMutex.Unlock()
	
	if cancel, exists := q.activeJobs[jobID]; exists {
		cancel()
		delete(q.activeJobs, jobID)
		
		// Update job status in database
		ctx := context.Background()
		_, err := q.db.Collection("jobs").UpdateOne(
			ctx,
			bson.M{"_id": jobID},
			bson.M{
				"$set": bson.M{
					"stage":     StageCanceled,
					"updatedAt": primitive.NewDateTimeFromTime(time.Now()),
				},
			},
		)
		
		q.notifyUpdate(JobUpdate{
			JobID: jobID.Hex(),
			Stage: StageCanceled,
		})
		
		return err
	}
	
	return fmt.Errorf("job not found or not active")
}

// Subscribe adds a listener for job updates
func (q *Queue) Subscribe() chan JobUpdate {
	q.listenersMutex.Lock()
	defer q.listenersMutex.Unlock()
	
	ch := make(chan JobUpdate, 10)
	q.updateListeners = append(q.updateListeners, ch)
	return ch
}

// Unsubscribe removes a listener
func (q *Queue) Unsubscribe(ch chan JobUpdate) {
	q.listenersMutex.Lock()
	defer q.listenersMutex.Unlock()
	
	for i, listener := range q.updateListeners {
		if listener == ch {
			close(ch)
			q.updateListeners = append(q.updateListeners[:i], q.updateListeners[i+1:]...)
			break
		}
	}
}

// notifyUpdate sends update to all listeners
func (q *Queue) notifyUpdate(update JobUpdate) {
	q.listenersMutex.RLock()
	defer q.listenersMutex.RUnlock()
	
	for _, listener := range q.updateListeners {
		select {
		case listener <- update:
		default:
			// Skip if listener is full
		}
	}
}

// worker processes jobs from the queue
func (q *Queue) worker(id int) {
	defer q.wg.Done()
	log.Printf("Worker %d started", id)
	
	for {
		select {
		case <-q.stopChan:
			log.Printf("Worker %d stopping", id)
			return
		case jobID := <-q.jobChan:
			q.processJob(jobID)
		}
	}
}

// processJob processes a single job
func (q *Queue) processJob(jobID primitive.ObjectID) {
	ctx, cancel := context.WithCancel(context.Background())
	
	// Register cancel function
	q.activeJobsMutex.Lock()
	q.activeJobs[jobID] = cancel
	q.activeJobsMutex.Unlock()
	
	defer func() {
		q.activeJobsMutex.Lock()
		delete(q.activeJobs, jobID)
		q.activeJobsMutex.Unlock()
	}()
	
	// Fetch job from database
	var job map[string]interface{}
	err := q.db.Collection("jobs").FindOne(ctx, bson.M{"_id": jobID}).Decode(&job)
	if err != nil {
		log.Printf("Failed to fetch job %s: %v", jobID.Hex(), err)
		return
	}
	
	log.Printf("Processing job %s (type: %s)", jobID.Hex(), job["type"])
	
	// Update stage to transcoding
	q.updateJobStage(ctx, jobID, StageTranscoding, 0)
	
	// Process based on transcode mode
	transcodeMode, _ := job["transcodeMode"].(string)
	
	if transcodeMode == "none" {
		// Skip transcoding, go straight to tagging
		q.updateJobStage(ctx, jobID, StageTagging, 50)
		time.Sleep(1 * time.Second) // Simulate tagging
		q.updateJobStage(ctx, jobID, StageMoving, 75)
		time.Sleep(1 * time.Second) // Simulate moving
		q.updateJobStage(ctx, jobID, StageCompleted, 100)
	} else if transcodeMode == "server" {
		// Server-side transcoding
		// This will be replaced with actual transcoding logic
		for i := 0; i <= 100; i += 10 {
			select {
			case <-ctx.Done():
				log.Printf("Job %s canceled", jobID.Hex())
				return
			default:
				q.updateJobStage(ctx, jobID, StageTranscoding, float64(i)*0.7)
				time.Sleep(500 * time.Millisecond)
			}
		}
		
		q.updateJobStage(ctx, jobID, StageTagging, 75)
		time.Sleep(1 * time.Second)
		q.updateJobStage(ctx, jobID, StageMoving, 90)
		time.Sleep(1 * time.Second)
		q.updateJobStage(ctx, jobID, StageCompleted, 100)
	} else {
		// Local transcoding (handled by Electron)
		// Just wait for completion or move to tagging
		q.updateJobStage(ctx, jobID, StageTagging, 70)
		time.Sleep(1 * time.Second)
		q.updateJobStage(ctx, jobID, StageMoving, 90)
		time.Sleep(1 * time.Second)
		q.updateJobStage(ctx, jobID, StageCompleted, 100)
	}
	
	log.Printf("Job %s completed", jobID.Hex())
}

// updateJobStage updates the job stage and progress
func (q *Queue) updateJobStage(ctx context.Context, jobID primitive.ObjectID, stage string, progress float64) {
	update := bson.M{
		"stage":     stage,
		"progress":  progress,
		"updatedAt": primitive.NewDateTimeFromTime(time.Now()),
	}
	
	if stage == StageCompleted || stage == StageFailed || stage == StageCanceled {
		update["completedAt"] = primitive.NewDateTimeFromTime(time.Now())
	}
	
	_, err := q.db.Collection("jobs").UpdateOne(
		ctx,
		bson.M{"_id": jobID},
		bson.M{"$set": update},
	)
	
	if err != nil {
		log.Printf("Failed to update job %s: %v", jobID.Hex(), err)
		return
	}
	
	q.notifyUpdate(JobUpdate{
		JobID:    jobID.Hex(),
		Stage:    stage,
		Progress: progress,
	})
}

// loadPendingJobs loads jobs that were queued but not completed
func (q *Queue) loadPendingJobs() {
	ctx := context.Background()
	
	// Find jobs that are queued or in progress
	cursor, err := q.db.Collection("jobs").Find(ctx, bson.M{
		"stage": bson.M{
			"$in": []string{StageQueued, StageTranscoding, StageTagging, StageMoving},
		},
	})
	
	if err != nil {
		log.Printf("Failed to load pending jobs: %v", err)
		return
	}
	defer cursor.Close(ctx)
	
	count := 0
	for cursor.Next(ctx) {
		var job map[string]interface{}
		if err := cursor.Decode(&job); err != nil {
			continue
		}
		
		jobID := job["_id"].(primitive.ObjectID)
		q.Enqueue(jobID)
		count++
	}
	
	if count > 0 {
		log.Printf("Loaded %d pending jobs", count)
	}
}
