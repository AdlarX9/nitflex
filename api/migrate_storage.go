package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gin/storage"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// MigrateMovieStorage migrates movies from old uploads directory to MOVIES_DIR
func MigrateMovieStorage(db *mongo.Database, oldPath, newPath string) error {
	log.Printf("Starting movie storage migration from %s to %s", oldPath, newPath)

	ctx := context.Background()
	moviesCol := db.Collection("movies")

	// Find all movies
	cursor, err := moviesCol.Find(ctx, bson.M{})
	if err != nil {
		return fmt.Errorf("failed to fetch movies: %w", err)
	}
	defer cursor.Close(ctx)

	var movies []Movie
	if err := cursor.All(ctx, &movies); err != nil {
		return fmt.Errorf("failed to decode movies: %w", err)
	}

	log.Printf("Found %d movies to migrate", len(movies))

	storageBackend := storage.NewLocalStorage([]string{oldPath, newPath})
	migrated := 0
	skipped := 0
	failed := 0

	for _, movie := range movies {
		// Skip if already has FilePath set
		if movie.FilePath != "" {
			// Check if file exists at FilePath
			if _, err := os.Stat(movie.FilePath); err == nil {
				log.Printf("Movie %s already migrated to %s", movie.Title, movie.FilePath)
				skipped++
				continue
			}
		}

		// Find old file
		oldFilePath := filepath.Join(oldPath, movie.CustomTitle)
		if _, err := os.Stat(oldFilePath); os.IsNotExist(err) {
			log.Printf("WARNING: Movie file not found: %s", oldFilePath)
			failed++
			continue
		}

		// Determine new file path
		filename := fmt.Sprintf("%s_%d%s", sanitizeFilename(movie.Title), movie.TmdbID, filepath.Ext(movie.CustomTitle))
		newFilePath := filepath.Join(newPath, filename)

		// Move file
		log.Printf("Moving %s -> %s", oldFilePath, newFilePath)
		if err := storageBackend.MoveFile(oldFilePath, newFilePath); err != nil {
			log.Printf("ERROR: Failed to move file: %v", err)
			failed++
			continue
		}

		// Update database
		_, err := moviesCol.UpdateOne(
			ctx,
			bson.M{"_id": movie.ID},
			bson.M{"$set": bson.M{"filePath": newFilePath}},
		)
		if err != nil {
			log.Printf("ERROR: Failed to update database: %v", err)
			failed++
			continue
		}

		migrated++
		log.Printf("Successfully migrated: %s", movie.Title)
	}

	log.Printf("Migration complete: %d migrated, %d skipped, %d failed", migrated, skipped, failed)
	return nil
}

// sanitizeFilename removes invalid characters from filename
func sanitizeFilename(name string) string {
	invalid := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	result := name
	for _, char := range invalid {
		result = strings.ReplaceAll(result, char, "")
	}
	return result
}

// RunMigration runs the storage migration if needed
func RunMigration() error {
	tempDir := os.Getenv("TEMP_DIR")
	moviesDir := os.Getenv("MOVIES_DIR")

	if tempDir == "" || moviesDir == "" {
		return fmt.Errorf("TEMP_DIR and MOVIES_DIR must be configured")
	}

	// Check if migration is needed
	db := GetDatabase()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Count movies without FilePath
	count, err := db.Collection("movies").CountDocuments(ctx, bson.M{
		"$or": []bson.M{
			{"filePath": bson.M{"$exists": false}},
			{"filePath": ""},
		},
	})

	if err != nil {
		return fmt.Errorf("failed to count movies: %w", err)
	}

	if count == 0 {
		log.Println("No movies need migration")
		return nil
	}

	log.Printf("%d movies need migration", count)

	// Run migration
	return MigrateMovieStorage(db, tempDir, moviesDir)
}
