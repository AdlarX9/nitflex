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

// Helper pour gérer les timeouts de DB de manière plus souple (10s au lieu de 5s)
func getDBContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// GET /video/:id - Stream movie video
func VideoStreamHandler(c *gin.Context) {
	tmdbID := c.Param("id")

	ctx, cancel := getDBContext()
	defer cancel()

	var movie utils.Movie
	idInt, _ := strconv.Atoi(tmdbID)
	err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Film non trouvé"})
		} else {
			// Log l'erreur côté serveur pour debug
			fmt.Println("DB Error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		}
		return
	}

	if movie.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fichier vidéo non référencé"})
		return
	}

	serveVideoStream(movie.FilePath, c)
}

// GET /video/episode/:id - Stream episode video
func EpisodeStreamHandler(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	ctx, cancel := getDBContext()
	defer cancel()

	var episode utils.Episode
	err = utils.GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&episode)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		} else {
			fmt.Println("DB Error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	if episode.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video file not found"})
		return
	}

	serveVideoStream(episode.FilePath, c)
}

// GET /video/:id/chapters
func MovieChaptersHandler(c *gin.Context) {
	tmdbID := c.Param("id")
	ctx, cancel := getDBContext()
	defer cancel()

	var movie utils.Movie
	idInt, _ := strconv.Atoi(tmdbID)
	if err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie); err != nil {
		c.JSON(http.StatusOK, gin.H{"chapters": []any{}}) // Return empty array instead of error to not break frontend
		return
	}

	chapters, err := ffprobeChapters(movie.FilePath)
	if err != nil {
		fmt.Println("Chapters Error:", err)
		c.JSON(http.StatusOK, gin.H{"chapters": []any{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"chapters": chapters})
}

// GET /video/episode/:id/chapters
func EpisodeChaptersHandler(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}
	ctx, cancel := getDBContext()
	defer cancel()

	var ep utils.Episode
	if err := utils.GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&ep); err != nil {
		c.JSON(http.StatusOK, gin.H{"chapters": []any{}})
		return
	}

	chapters, err := ffprobeChapters(ep.FilePath)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"chapters": []any{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"chapters": chapters})
}

// --- HLS HANDLERS ---

func HLSMovieAsset(c *gin.Context) {
	id := c.Param("id")
	handleHLSRequest(c, "movie", id, func() (string, error) {
		idInt, _ := strconv.Atoi(id)
		var movie utils.Movie
		ctx, cancel := getDBContext()
		defer cancel()
		err := utils.GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": idInt}).Decode(&movie)
		return movie.FilePath, err
	})
}

func HLSEpisodeAsset(c *gin.Context) {
	id := c.Param("id")
	handleHLSRequest(c, "episode", id, func() (string, error) {
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return "", err
		}
		var ep utils.Episode
		ctx, cancel := getDBContext()
		defer cancel()
		err = utils.GetCollection("episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&ep)
		return ep.FilePath, err
	})
}

// Logique générique pour HLS afin d'éviter la duplication de code
func handleHLSRequest(c *gin.Context, typeMedia, id string, getPath func() (string, error)) {
	base := os.Getenv("HLS_DIR")
	if base == "" {
		base = "./hls_cache"
	}
	outDir := filepath.Join(base, typeMedia, id)
	asset := strings.TrimPrefix(c.Param("asset"), "/")

	// Si demande master playlist ou racine
	if asset == "" || asset == "master.m3u8" {
		asset = "master.m3u8"
		// On vérifie si le fichier existe DÉJÀ avant de taper la DB
		if _, err := os.Stat(filepath.Join(outDir, asset)); os.IsNotExist(err) {
			inputPath, err := getPath()
			if err != nil {
				c.Status(http.StatusNotFound)
				return
			}
			if err2 := ensureHLS(inputPath, outDir); err2 != nil {
				fmt.Println("HLS Generation Error:", err2)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate HLS"})
				return
			}
		}
	}

	path := filepath.Join(outDir, filepath.Clean(asset))
	// Sécurité : Path Traversal Check
	if !strings.HasPrefix(path, outDir) {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}

	// Définition correcte des headers
	ext := strings.ToLower(filepath.Ext(asset))
	switch ext {
	case ".m3u8":
		c.Header("Content-Type", "application/vnd.apple.mpegurl")
		c.Header("Cache-Control", "no-cache") // Playlist ne doit pas être cachée
	case ".ts":
		c.Header("Content-Type", "video/mp2t")
		c.Header("Cache-Control", "public, max-age=31536000") // Segments cachés longtemps
	}

	c.File(path)
}

// --- CORE FUNCTIONS ---

// Optimisé: Utilisation de c.File() qui utilise http.ServeContent nativement
// Cela gère automatiquement les Range Requests, les erreurs de pipe, et les headers 206
func serveVideoStream(filePath string, c *gin.Context) {
	// Vérification basique
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found on disk"})
		return
	}

	// Gin c.File() est un wrapper autour de http.ServeFile
	// Il gère parfaitement le streaming, le seek, et la reprise de téléchargement
	c.File(filePath)
}

func ensureHLS(inputPath, outDir string) error {
	// Double check rapide
	if _, err := os.Stat(filepath.Join(outDir, "master.m3u8")); err == nil {
		return nil
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	segPattern := filepath.Join(outDir, "segment_%03d.ts")
	master := filepath.Join(outDir, "master.m3u8")

	// Utilisation de context pour tuer ffmpeg si ça prend trop de temps (ex: 10 minutes max)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx,
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

func ffprobeChapters(inputPath string) ([]map[string]interface{}, error) {
	// Ajout timeout pour éviter de bloquer indéfiniment
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "ffprobe", "-v", "error", "-print_format", "json", "-show_chapters", inputPath)
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

func PosterHandler(c *gin.Context) {
	tmdbID := c.Param("id")
	posterFile := filepath.Join("uploads", tmdbID+".jpg")
	if _, err := os.Stat(posterFile); os.IsNotExist(err) {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	c.File(posterFile)
}
