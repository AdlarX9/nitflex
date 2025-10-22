package transcode

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// MetadataOptions holds metadata to embed
type MetadataOptions struct {
	VideoPath   string
	PosterPath  string
	Title       string
	Year        string
	Description string
	Genre       string
	Artist      string
}

// EmbedMetadata embeds poster and metadata into video file
func EmbedMetadata(opts MetadataOptions) error {
	if opts.VideoPath == "" {
		return fmt.Errorf("video path is required")
	}

	// Create temporary output file
	tempOutput := opts.VideoPath + ".tagged.mp4"
	defer os.Remove(tempOutput) // Clean up temp file

	args := []string{
		"-i", opts.VideoPath,
	}

	// Add poster if provided
	if opts.PosterPath != "" && fileExists(opts.PosterPath) {
		args = append(args,
			"-i", opts.PosterPath,
			"-map", "0", // Map all streams from first input (video)
			"-map", "1", // Map poster image
			"-c", "copy", // Copy without re-encoding
			"-disposition:v:1", "attached_pic", // Mark as attached picture
		)
	} else {
		args = append(args,
			"-i", opts.VideoPath,
			"-c", "copy",
		)
	}

	// Add text metadata
	if opts.Title != "" {
		args = append(args, "-metadata", fmt.Sprintf("title=%s", opts.Title))
	}
	if opts.Year != "" {
		args = append(args, "-metadata", fmt.Sprintf("date=%s", opts.Year))
	}
	if opts.Description != "" {
		args = append(args, "-metadata", fmt.Sprintf("comment=%s", opts.Description))
		args = append(args, "-metadata", fmt.Sprintf("description=%s", opts.Description))
	}
	if opts.Genre != "" {
		args = append(args, "-metadata", fmt.Sprintf("genre=%s", opts.Genre))
	}
	if opts.Artist != "" {
		args = append(args, "-metadata", fmt.Sprintf("artist=%s", opts.Artist))
	}

	// Add output file
	args = append(args, "-y", tempOutput)

	// Run ffmpeg
	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %w - %s", err, string(output))
	}

	// Replace original file with tagged version
	if err := os.Rename(tempOutput, opts.VideoPath); err != nil {
		return fmt.Errorf("failed to replace original file: %w", err)
	}

	return nil
}

// EmbedPosterOnly embeds just the poster without other metadata
func EmbedPosterOnly(videoPath, posterPath string) error {
	if !fileExists(posterPath) {
		return fmt.Errorf("poster file does not exist: %s", posterPath)
	}

	tempOutput := videoPath + ".poster.mp4"
	defer os.Remove(tempOutput)

	args := []string{
		"-i", videoPath,
		"-i", posterPath,
		"-map", "0",
		"-map", "1",
		"-c", "copy",
		"-disposition:v:1", "attached_pic",
		"-y", tempOutput,
	}

	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %w - %s", err, string(output))
	}

	if err := os.Rename(tempOutput, videoPath); err != nil {
		return fmt.Errorf("failed to replace original file: %w", err)
	}

	return nil
}

// ExtractPoster extracts embedded poster from video file
func ExtractPoster(videoPath, outputPath string) error {
	args := []string{
		"-i", videoPath,
		"-map", "0:v:1", // Extract second video stream (poster)
		"-c", "copy",
		"-y", outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %w - %s", err, string(output))
	}

	return nil
}

// TagVideo is a convenience function that combines transcoding and tagging
func TagVideo(videoPath, posterPath, title, year, description string) error {
	return EmbedMetadata(MetadataOptions{
		VideoPath:   videoPath,
		PosterPath:  posterPath,
		Title:       title,
		Year:        year,
		Description: description,
	})
}

// fileExists checks if a file exists
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// DownloadAndEmbedPoster downloads a poster from URL and embeds it
func DownloadAndEmbedPoster(videoPath, posterURL, title, year, description string) error {
	// Create temporary directory for poster
	tempDir := filepath.Join(os.TempDir(), "nitflex_posters")
	os.MkdirAll(tempDir, 0755)

	posterPath := filepath.Join(tempDir, fmt.Sprintf("%s_poster.jpg", filepath.Base(videoPath)))
	defer os.Remove(posterPath)

	// Download poster using curl/wget (or implement HTTP download)
	cmd := exec.Command("curl", "-o", posterPath, "-L", posterURL)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to download poster: %w", err)
	}

	// Embed metadata
	return EmbedMetadata(MetadataOptions{
		VideoPath:   videoPath,
		PosterPath:  posterPath,
		Title:       title,
		Year:        year,
		Description: description,
	})
}
