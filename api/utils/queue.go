package utils

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"strings"
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

// moveToFinal moves the processed file to production storage and updates media FilePath
func (q *Queue) moveToFinal(ctx context.Context, job map[string]interface{}) (string, error) {
	storage := NewLocalStorage([]string{TEMP_DIR, MOVIES_DIR, MOVIES_DOCU_DIR, SERIES_DIR, SERIES_DOCU_DIR, SERIES_KID_DIR})

	// Extract job fields
	jtype, _ := job["type"].(string)
	inputPath, _ := job["inputPath"].(string)
	mediaID, _ := job["mediaID"].(primitive.ObjectID)

	if inputPath == "" || mediaID == primitive.NilObjectID {
		return "", fmt.Errorf("invalid job data: missing inputPath or mediaID")
	}

	// Determine extension
	ext := strings.ToLower(filepath.Ext(inputPath))
	if ext == "" {
		ext = ".mp4"
	}

	switch jtype {
	case "movie":
		// Load movie
		var mv Movie
		if err := q.db.Collection("movies").FindOne(ctx, bson.M{"_id": mediaID}).Decode(&mv); err != nil {
			return "", fmt.Errorf("movie not found: %w", err)
		}
		title := mv.CustomTitle
		if title == "" {
			title = mv.Title
		}
		fileName := fmt.Sprintf("%s%s", sanitizeFileName(title), ext)
		// Category selection
		targetDir := MOVIES_DIR
		if optsRaw, ok := job["transcodeOptions"]; ok {
			switch opts := optsRaw.(type) {
			case map[string]interface{}:
				if v, ok := opts["isDocumentary"].(bool); ok && v {
					targetDir = MOVIES_DOCU_DIR
				}
			case bson.M:
				if v, ok := opts["isDocumentary"].(bool); ok && v {
					targetDir = MOVIES_DOCU_DIR
				}
			}
		}
		dst := filepath.Join(targetDir, fileName)
		if err := storage.MoveFile(inputPath, dst); err != nil {
			return "", fmt.Errorf("move failed: %w", err)
		}
		// Update movie path
		if _, err := q.db.Collection("movies").UpdateOne(ctx, bson.M{"_id": mv.ID}, bson.M{"$set": bson.M{"filePath": dst}}); err != nil {
			return "", fmt.Errorf("failed to update movie path: %w", err)
		}
		return dst, nil

	case "episode":
		// Load episode and series
		var ep Episode
		if err := q.db.Collection("episodes").FindOne(ctx, bson.M{"_id": mediaID}).Decode(&ep); err != nil {
			return "", fmt.Errorf("episode not found: %w", err)
		}
		var series Series
		if err := q.db.Collection("series").FindOne(ctx, bson.M{"_id": ep.SeriesID}).Decode(&series); err != nil {
			return "", fmt.Errorf("series not found: %w", err)
		}

		seriesFolder := sanitizeFileName(series.Title)
		if strings.TrimSpace(series.CustomTitle) != "" {
			seriesFolder = sanitizeFileName(series.CustomTitle)
		}
		// Category selection for series
		baseRoot := SERIES_DIR
		if optsRaw, ok := job["transcodeOptions"]; ok {
			switch opts := optsRaw.(type) {
			case map[string]interface{}:
				if v, ok := opts["isDocu"].(bool); ok && v {
					baseRoot = SERIES_DOCU_DIR
				}
				if v, ok := opts["isKids"].(bool); ok && v {
					baseRoot = SERIES_KID_DIR
				}
			case bson.M:
				if v, ok := opts["isDocu"].(bool); ok && v {
					baseRoot = SERIES_DOCU_DIR
				}
				if v, ok := opts["isKids"].(bool); ok && v {
					baseRoot = SERIES_KID_DIR
				}
			}
		}

		base := filepath.Join(baseRoot, seriesFolder)
		seasonFolder := fmt.Sprintf("Saison %d", ep.SeasonNumber)
		// Build filename: SS EE title.ext => e.g., 0106 Mon titre.mp4
		titleStr := strings.TrimSpace(ep.Title)
		fileName := fmt.Sprintf("%02d%02d %s%s", ep.SeasonNumber, ep.EpisodeNumber, sanitizeFileName(titleStr), ext)
		dst := filepath.Join(base, seasonFolder, fileName)
		if err := storage.MoveFile(inputPath, dst); err != nil {
			return "", fmt.Errorf("move failed: %w", err)
		}
		// Update episode path
		if _, err := q.db.Collection("episodes").UpdateOne(ctx, bson.M{"_id": ep.ID}, bson.M{"$set": bson.M{"filePath": dst}}); err != nil {
			return "", fmt.Errorf("failed to update episode path: %w", err)
		}
		return dst, nil
	}

	return "", fmt.Errorf("unsupported job type: %s", jtype)
}

func sanitizeFileName(name string) string {
	n := strings.TrimSpace(name)
	if n == "" {
		return "untitled"
	}

	// Remplace les caractères invalides (Windows: <>:"/\|?*)
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", " - ",
		"*", "-",
		"?", "",
		"\"", "",
		"<", "",
		">", "",
		"|", "-",
	)
	n = replacer.Replace(n)

	// Nettoyage léger
	n = strings.TrimSpace(n)
	n = strings.Trim(n, " .")                  // évite noms qui finissent par espace/point (Windows)
	n = strings.Join(strings.Fields(n), " ")   // compresse les espaces multiples

	if n == "" {
		n = "untitled"
	}
	return n
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

	ch := make(chan JobUpdate, 256)
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

// processJob processes a single job => Progression simulée pouette pouette cacahuète chatgpt :|
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
		// No transcoding: directly move to final destination
		q.updateJobStage(ctx, jobID, StageMoving, 90)
		if _, err := q.moveToFinal(ctx, job); err != nil {
			log.Printf("Job %s move failed: %v", jobID.Hex(), err)
			q.updateJobStage(ctx, jobID, StageFailed, 0)
			return
		}
		q.updateJobStage(ctx, jobID, StageCompleted, 100)
	} else if transcodeMode == "server" {
		// Real server-side transcoding with ffmpeg and tagging
		inPath, _ := job["inputPath"].(string)
		if strings.TrimSpace(inPath) == "" {
			log.Printf("Job %s missing inputPath", jobID.Hex())
			q.updateJobStage(ctx, jobID, StageFailed, 0)
			return
		}

		base := strings.TrimSuffix(filepath.Base(inPath), filepath.Ext(inPath))
		outPath := filepath.Join(TEMP_DIR, base+"_transcoded.mp4")

		progressChan := make(chan float64, 10)
		opts := DefaultOptions()
		opts.InputPath = inPath
		opts.OutputPath = outPath
		opts.ProgressChan = progressChan

		done := make(chan struct{})
		go func() {
			defer close(done)
			for p := range progressChan {
				// Cap transcoding progress at 75%
				prog := p * 0.75
				if prog > 75 {
					prog = 75
				}
				q.updateJobStage(ctx, jobID, StageTranscoding, prog)
			}
		}()

		if err := Transcode(ctx, opts); err != nil {
			if ctx.Err() == context.Canceled {
				q.updateJobStage(ctx, jobID, StageCanceled, 0)
				return
			}
			log.Printf("Job %s transcoding failed: %v", jobID.Hex(), err)
			q.updateJobStage(ctx, jobID, StageFailed, 0)
			return
		}
		<-done

		// Tagging (embed poster and metadata)
		q.updateJobStage(ctx, jobID, StageTagging, 85)

		// Determine metadata (title/poster)
		jtype, _ := job["type"].(string)
		mediaID, _ := job["mediaID"].(primitive.ObjectID)
		title := ""
		posterURL := ""
		switch jtype {
		case "movie":
			var mv Movie
			if err := q.db.Collection("movies").FindOne(ctx, bson.M{"_id": mediaID}).Decode(&mv); err == nil {
				if strings.TrimSpace(mv.CustomTitle) != "" {
					title = mv.CustomTitle
				} else {
					title = mv.Title
				}
				posterURL = strings.TrimSpace(mv.Poster)
			}
		case "episode":
			var ep Episode
			var series Series
			if err := q.db.Collection("episodes").FindOne(ctx, bson.M{"_id": mediaID}).Decode(&ep); err == nil {
				if err2 := q.db.Collection("series").FindOne(ctx, bson.M{"_id": ep.SeriesID}).Decode(&series); err2 == nil {
					title = strings.TrimSpace(ep.Title)
					posterURL = strings.TrimSpace(series.Poster)
				}
			}
		}
		if strings.HasPrefix(posterURL, "/") {
			posterURL = "https://image.tmdb.org/t/p/w500" + posterURL
		}

		if posterURL != "" && title != "" {
			if err := DownloadAndEmbedPoster(outPath, posterURL, title, "", ""); err != nil {
				log.Printf("Job %s tagging failed (poster embed): %v", jobID.Hex(), err)
				// do not fail the whole job if tagging fails; continue to move
			}
		}

		// Move to final destination
		q.updateJobStage(ctx, jobID, StageMoving, 95)
		job["inputPath"] = outPath
		if _, err := q.moveToFinal(ctx, job); err != nil {
			log.Printf("Job %s move failed: %v", jobID.Hex(), err)
			q.updateJobStage(ctx, jobID, StageFailed, 0)
			return
		}
		q.updateJobStage(ctx, jobID, StageCompleted, 100)
	} else {
		// Local transcoding (handled by Electron): just move and finish
		q.updateJobStage(ctx, jobID, StageTagging, 70)
		time.Sleep(500 * time.Millisecond)
		q.updateJobStage(ctx, jobID, StageMoving, 90)
		if _, err := q.moveToFinal(ctx, job); err != nil {
			log.Printf("Job %s move failed: %v", jobID.Hex(), err)
			q.updateJobStage(ctx, jobID, StageFailed, 0)
			return
		}
		q.updateJobStage(ctx, jobID, StageCompleted, 100)
	}

	log.Printf("Job %s completed", jobID.Hex())

	// Delete job document after completion
	if _, err := q.db.Collection("jobs").DeleteOne(ctx, bson.M{"_id": jobID}); err != nil {
		log.Printf("Failed to delete completed job %s: %v", jobID.Hex(), err)
	} else {
		log.Printf("Deleted completed job %s", jobID.Hex())
	}
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
