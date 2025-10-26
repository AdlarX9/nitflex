package utils

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// TranscodeOptions holds transcoding configuration
type TranscodeOptions struct {
	InputPath    string
	OutputPath   string
	VideoCodec   string
	AudioCodec   string
	CRF          int
	Preset       string
	Resolution   string
	HWAccel      bool
	ProgressChan chan float64
}

// DefaultOptions returns Apple TV compatible defaults
func DefaultOptions() TranscodeOptions {
	return TranscodeOptions{
		VideoCodec: "h264",
		AudioCodec: "aac",
		CRF:        21,
		Preset:     "veryfast",
		HWAccel:    true,
	}
}

// Transcode performs video transcoding with progress updates
func Transcode(ctx context.Context, opts TranscodeOptions) error {
	args := buildFFmpegArgs(opts)
	
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	
	// Get stderr pipe for progress
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg: %w", err)
	}
	
	// Parse progress
	go parseProgress(stderrPipe, opts.ProgressChan)
	
	// Wait for completion
	if err := cmd.Wait(); err != nil {
		if ctx.Err() == context.Canceled {
			return fmt.Errorf("transcoding canceled")
		}
		return fmt.Errorf("ffmpeg failed: %w", err)
	}
	
	if opts.ProgressChan != nil {
		opts.ProgressChan <- 100.0
		close(opts.ProgressChan)
	}
	
	return nil
}

// buildFFmpegArgs constructs ffmpeg command line arguments
func buildFFmpegArgs(opts TranscodeOptions) []string {
	args := []string{"-y"} // Overwrite output
	
	// Hardware acceleration
	if opts.HWAccel {
		hwArgs := getHWAccelArgs()
		args = append(args, hwArgs...)
	}
	
	// Input
	args = append(args, "-i", opts.InputPath)
	
	// Video codec
	if opts.HWAccel {
		args = append(args, "-c:v", getHWVideoCodec())
	} else {
		args = append(args, "-c:v", "libx264")
	}
	
	// Video options
	args = append(args,
		"-profile:v", "high",
		"-level:v", "4.1",
	)
	
	if !opts.HWAccel {
		args = append(args, "-crf", strconv.Itoa(opts.CRF))
		args = append(args, "-preset", opts.Preset)
	}
	
	// Audio
	args = append(args,
		"-c:a", "aac",
		"-b:a", "160k",
		"-ac", "2", // Stereo
	)
	
	// Container options
	args = append(args,
		"-movflags", "+faststart", // Progressive download
		"-f", "mp4",
	)
	
	// Progress output
	args = append(args, "-progress", "pipe:2")
	
	// Output
	args = append(args, opts.OutputPath)
	
	return args
}

// getHWAccelArgs returns hardware acceleration input args
func getHWAccelArgs() []string {
	switch runtime.GOOS {
	case "darwin":
		// VideoToolbox on macOS
		return []string{}
	case "windows":
		// Try NVENC on Windows
		return []string{"-hwaccel", "cuda", "-hwaccel_output_format", "cuda"}
	case "linux":
		// Try VAAPI on Linux
		return []string{"-hwaccel", "vaapi", "-hwaccel_device", "/dev/dri/renderD128"}
	}
	return []string{}
}

// getHWVideoCodec returns hardware-accelerated video codec
func getHWVideoCodec() string {
	switch runtime.GOOS {
	case "darwin":
		return "h264_videotoolbox"
	case "windows":
		return "h264_nvenc"
	case "linux":
		return "h264_vaapi"
	}
	return "libx264"
}

// parseProgress parses ffmpeg progress from stderr
func parseProgress(stderr io.ReadCloser, progressChan chan float64) {
	if progressChan == nil {
		return
	}
	
	// Regex to extract time and duration
	timeRe := regexp.MustCompile(`time=(\d{2}):(\d{2}):(\d{2}\.\d{2})`)
	durationRe := regexp.MustCompile(`Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})`)
	
	var totalDuration float64
	
	scanner := bufio.NewScanner(stderr)
	for scanner.Scan() {
		line := scanner.Text()
		
		// Extract total duration from first match
		if totalDuration == 0 {
			if matches := durationRe.FindStringSubmatch(line); len(matches) == 4 {
				totalDuration = parseTime(matches[1], matches[2], matches[3])
			}
		}
		
		// Extract current time
		if matches := timeRe.FindStringSubmatch(line); len(matches) == 4 {
			currentTime := parseTime(matches[1], matches[2], matches[3])
			
			if totalDuration > 0 {
				progress := (currentTime / totalDuration) * 100.0
				if progress > 100 {
					progress = 100
				}
				
				select {
				case progressChan <- progress:
				default:
				}
			}
		}
	}
}

// parseTime converts HH:MM:SS.SS to seconds
func parseTime(hours, minutes, seconds string) float64 {
	h, _ := strconv.ParseFloat(hours, 64)
	m, _ := strconv.ParseFloat(minutes, 64)
	s, _ := strconv.ParseFloat(seconds, 64)
	return h*3600 + m*60 + s
}

// GetVideoDuration returns video duration in seconds
func GetVideoDuration(videoPath string) (float64, error) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)
	
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe failed: %w", err)
	}
	
	duration, err := strconv.ParseFloat(strings.TrimSpace(string(output)), 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse duration: %w", err)
	}
	
	return duration, nil
}

// GetVideoResolution detects video resolution
func GetVideoResolution(videoPath string) (width, height int, err error) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=s=x:p=0",
		videoPath,
	)
	
	output, err := cmd.Output()
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe failed: %w", err)
	}
	
	parts := strings.Split(strings.TrimSpace(string(output)), "x")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("unexpected ffprobe output format")
	}
	
	width, _ = strconv.Atoi(parts[0])
	height, _ = strconv.Atoi(parts[1])
	
	return width, height, nil
}

// QuickTranscode performs a quick test transcode
func QuickTranscode(inputPath, outputPath string, progressCallback func(float64)) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	
	progressChan := make(chan float64, 10)
	opts := DefaultOptions()
	opts.InputPath = inputPath
	opts.OutputPath = outputPath
	opts.ProgressChan = progressChan
	
	// Progress monitor
	done := make(chan struct{})
	go func() {
		defer close(done)
		for progress := range progressChan {
			if progressCallback != nil {
				progressCallback(progress)
			}
			log.Printf("Transcoding progress: %.1f%%", progress)
		}
	}()
	
	err := Transcode(ctx, opts)
	<-done
	
	return err
}
