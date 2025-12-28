package handlers

import (
	"api/utils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// GET /video/:id - Stream movie video
func VideoStreamHandler(c *gin.Context) {
	tmdbID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Récupérer le film dans la base de données
	var movie utils.Movie
	idInt, _ := strconv.Atoi(tmdbID)
	err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Film non trouvé"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		}
		return
	}

	// Chemin du fichier vidéo stocké
	videoFile := movie.FilePath

	// Stream directement la vidéo
	serveVideoStream(videoFile, c)
}

// GET /video/:id/chapters - chapters for a movie
func MovieChaptersHandler(c *gin.Context) {
	tmdbID := c.Param("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var movie utils.Movie
	idInt, _ := strconv.Atoi(tmdbID)
	if err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie); err != nil {
		status := http.StatusInternalServerError
		if err == mongo.ErrNoDocuments {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": "Movie not found"})
		return
	}
	if movie.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "File path missing"})
		return
	}
	chapters, err := ffprobeChapters(movie.FilePath)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"chapters": []any{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"chapters": chapters})
}

// GET /video/episode/:id/chapters - chapters for an episode
func EpisodeChaptersHandler(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var ep utils.Episode
	if err := utils.GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&ep); err != nil {
		status := http.StatusInternalServerError
		if err == mongo.ErrNoDocuments {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": "Episode not found"})
		return
	}
	if ep.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "File path missing"})
		return
	}
	chapters, err := ffprobeChapters(ep.FilePath)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"chapters": []any{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"chapters": chapters})
}

// --- Chapters extraction using ffprobe ---

// ffprobeChapters extracts chapters as [{start, end, title}] from a media file
func ffprobeChapters(inputPath string) ([]map[string]interface{}, error) {
	cmd := exec.Command("ffprobe", "-v", "error", "-print_format", "json", "-show_chapters", inputPath)
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var parsed struct {
		Chapters []struct {
			StartTime string            `json:"start_time"`
			EndTime   string            `json:"end_time"`
			Tags      map[string]string `json:"tags"`
		} `json:"chapters"`
	}
	if err := json.Unmarshal(out, &parsed); err != nil {
		return nil, err
	}
	res := make([]map[string]interface{}, 0, len(parsed.Chapters))
	for _, ch := range parsed.Chapters {
		st, _ := strconv.ParseFloat(ch.StartTime, 64)
		et, _ := strconv.ParseFloat(ch.EndTime, 64)
		title := ""
		if ch.Tags != nil {
			if t, ok := ch.Tags["title"]; ok {
				title = t
			}
		}
		res = append(res, map[string]interface{}{
			"start": st,
			"end":   et,
			"title": title,
		})
	}
	return res, nil
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

// ensureHLS generates HLS files into outDir if not already present
func ensureHLS(inputPath, outDir string) error {
	if _, err := os.Stat(filepath.Join(outDir, "master.m3u8")); err == nil {
		return nil
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}
	// Generate a single-variant HLS playlist and segments
	// Note: Requires ffmpeg in PATH
	segPattern := filepath.Join(outDir, "segment_%03d.ts")
	master := filepath.Join(outDir, "master.m3u8")
	cmd := exec.Command(
		"ffmpeg", "-y",
		"-i", inputPath,
		"-hide_banner", "-loglevel", "error",
		"-preset", "veryfast",
		"-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
		"-hls_time", "6", "-hls_list_size", "0",
		"-hls_segment_filename", segPattern,
		"-hls_flags", "independent_segments",
		"-c:v", "h264", "-c:a", "aac",
		master,
	)
	return cmd.Run()
}

// HLSMovieAsset serves HLS assets (segments/playlists) for a movie
// GET /hls/movie/:id/*asset
func HLSMovieAsset(c *gin.Context) {
	id := c.Param("id")
	base := os.Getenv("HLS_DIR")
	if base == "" {
		base = "./hls_cache"
	}
	outDir := filepath.Join(base, "movie", id)
	asset := strings.TrimPrefix(c.Param("asset"), "/")
	fmt.Println("HLSMovieAsset", asset)
	// If master playlist requested (or empty), ensure HLS exists
	if asset == "" || asset == "master.m3u8" {
		// Lookup movie to get input path
		idInt, _ := strconv.Atoi(id)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var movie utils.Movie
		if err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie); err == nil {
			if err2 := ensureHLS(movie.FilePath, outDir); err2 != nil {
				fmt.Println("HLSMovieAsset Error", err2)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate HLS"})
				return
			}
		}
		asset = "master.m3u8"
	}
	// prevent path traversal
	path := filepath.Join(outDir, filepath.Clean(asset))
	if !strings.HasPrefix(path, outDir) {
		fmt.Println("HLSMovieAsset Forbidden", path)
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	switch strings.ToLower(filepath.Ext(asset)) {
	case ".m3u8":
		c.Header("Content-Type", "application/vnd.apple.mpegurl")
	case ".ts":
		c.Header("Content-Type", "video/mp2t")
	}
	c.File(path)
}

// HLSEpisodeAsset serves HLS assets (segments/playlists) for an episode
// GET /hls/episode/:id/*asset
func HLSEpisodeAsset(c *gin.Context) {
	id := c.Param("id")
	base := os.Getenv("HLS_DIR")
	if base == "" {
		base = "./hls_cache"
	}
	outDir := filepath.Join(base, "episode", id)
	asset := strings.TrimPrefix(c.Param("asset"), "/")
	// If master playlist requested (or empty), ensure HLS exists
	if asset == "" || asset == "master.m3u8" {
		// Lookup episode to get input path
		objID, err := primitive.ObjectIDFromHex(id)
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			var ep utils.Episode
			if err := utils.GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&ep); err == nil {
				if err2 := ensureHLS(ep.FilePath, outDir); err2 != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate HLS"})
					return
				}
			}
		}
		asset = "master.m3u8"
	}
	path := filepath.Join(outDir, filepath.Clean(asset))
	if !strings.HasPrefix(path, outDir) {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	switch strings.ToLower(filepath.Ext(asset)) {
	case ".m3u8":
		c.Header("Content-Type", "application/vnd.apple.mpegurl")
	case ".ts":
		c.Header("Content-Type", "video/mp2t")
	}
	c.File(path)
}

// Sert le poster (optionnel)
func PosterHandler(c *gin.Context) {
	tmdbID := c.Param("id")
	posterFile := filepath.Join("uploads", tmdbID+".jpg")
	c.File(posterFile)
}

// Streaming vidéo avec gestion des Range Requests
func serveVideoStream(filePath string, c *gin.Context) {
	f, err := os.Open(filePath)
	if err != nil {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	defer f.Close()

	fileStat, err := f.Stat()
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	rangeHeader := c.GetHeader("Range")
	if rangeHeader == "" {
		// Pas de Range => envoie tout
		c.Header("Content-Type", "video/mp4")
		c.Header("Content-Length", strconv.FormatInt(fileStat.Size(), 10))
		c.File(filePath)
		return
	}

	// Avec Range: bytes=start-end
	c.Header("Content-Type", "video/mp4")
	ranges := strings.Split(strings.Replace(rangeHeader, "bytes=", "", 1), "-")
	start, _ := strconv.ParseInt(ranges[0], 10, 64)
	var end int64 = fileStat.Size() - 1
	if len(ranges) > 1 && ranges[1] != "" {
		end, _ = strconv.ParseInt(ranges[1], 10, 64)
	}
	if end >= fileStat.Size() {
		end = fileStat.Size() - 1
	}
	length := end - start + 1

	c.Status(http.StatusPartialContent)
	c.Header("Accept-Ranges", "bytes")
	c.Header("Content-Range", "bytes "+strconv.FormatInt(start, 10)+"-"+strconv.FormatInt(end, 10)+"/"+strconv.FormatInt(fileStat.Size(), 10))
	c.Header("Content-Length", strconv.FormatInt(length, 10))

	f.Seek(start, 0)
	buf := make([]byte, 1024*1024) // 1Mo buffer
	var sent int64 = 0
	for sent < length {
		toRead := int64(len(buf))
		if (length - sent) < toRead {
			toRead = length - sent
		}
		n, err := f.Read(buf[:toRead])
		if n > 0 {
			c.Writer.Write(buf[:n])
			sent += int64(n)
		}
		if err != nil {
			break
		}
	}
}
