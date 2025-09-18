package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	uploadDir = "./uploads"
	// Pour éviter de lancer le script plusieurs fois si plusieurs chunks arrivent en même temps
	processLock sync.Map
	// Pour limiter les extensions autorisées
	allowedExt = regexp.MustCompile(`\.mp4$|\.mov$|\.mkv$|\.avi$|\.webm$`)
)

// Utilitaire: vérifie le nom de fichier
func isValidFilename(name string) bool {
	if len(name) < 1 || len(name) > 256 {
		return false
	}
	if !allowedExt.MatchString(name) {
		return false
	}
	// Pas de chemins relatifs, pas de caractères dangereux
	if matched, _ := regexp.MatchString(`[\\/:*?"<>|]`, name); matched {
		return false
	}
	return true
}

// Assemble les chunks dans l'ordre
func assembleChunks(fileTempDir, filename string, totalChunks int) (string, error) {
	finalPath := filepath.Join(uploadDir, filename)
	finalFile, err := os.Create(finalPath)
	if err != nil {
		return "", fmt.Errorf("unable to create final file: %w", err)
	}
	defer finalFile.Close()

	for i := 1; i <= totalChunks; i++ {
		chunkPart := filepath.Join(fileTempDir, fmt.Sprintf("chunk_%d", i))
		part, err := os.Open(chunkPart)
		if err != nil {
			return "", fmt.Errorf("missing chunk %d: %w", i, err)
		}
		_, err = io.Copy(finalFile, part)
		part.Close()
		if err != nil {
			return "", fmt.Errorf("unable to copy chunk %d: %w", i, err)
		}
		os.Remove(chunkPart)
	}
	os.Remove(fileTempDir)
	return finalPath, nil
}

// Lance le script Python (non bloquant)
func processMovieAsync(path string) {
	go func() {
		log.Printf("Lancement du script Python pour: %s", path)
		cmd := exec.Command("python3", "process_movie.py", path)
		// Optionnel: redirige la sortie pour log
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			log.Printf("Erreur script Python: %v", err)
		} else {
			log.Printf("Traitement Python terminé pour: %s", path)
		}
	}()
}

// Traitement d'un chunk de fichier (upload en plusieurs parties)
// Retourne un JSON avec un message d'erreur si le traitement échoue
// POST /movies/upload_chunk
func UploadChunk(c *gin.Context) {
	start := time.Now()
	// Récupération métadonnées Uppy
	// fileID est un identifiant unique pour le fichier en cours d'upload
	fileID := c.PostForm("uppy-chunked-upload-id")
	// chunkNumber est le numéro du chunk actuel (commence à 1)
	chunkNumberStr := c.PostForm("uppy-chunk-number")
	// totalChunks est le nombre total de chunks attendus pour le fichier
	totalChunksStr := c.PostForm("uppy-total-chunks")
	// filename est le nom du fichier voulu par l'utilisateur
	filename := c.PostForm("uppy-filename")
	// totalSize est la taille totale attendue pour le fichier (en octets)
	totalSizeStr := c.PostForm("uppy-total-size")

	// Vérification des paramètres Uppy
	if fileID == "" || chunkNumberStr == "" || totalChunksStr == "" || filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing Uppy metadata"})
		return
	}

	if !isValidFilename(filename) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	// Conversion des paramètres Uppy en int
	chunkNumber, err := strconv.Atoi(chunkNumberStr)
	if err != nil || chunkNumber < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chunk number"})
		return
	}
	totalChunks, err := strconv.Atoi(totalChunksStr)
	if err != nil || totalChunks < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid total chunks"})
		return
	}
	var totalSize int64 = 0
	if totalSizeStr != "" {
		totalSize, _ = strconv.ParseInt(totalSizeStr, 10, 64)
	}

	// Chunk file
	file, _, err := c.Request.FormFile("chunk")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing chunk file"})
		return
	}
	defer file.Close()

	// Créer le dossier temporaire (unique par fileID)
	fileTempDir := filepath.Join(uploadDir, fileID)
	if err := os.MkdirAll(fileTempDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create temp dir"})
		return
	}

	// Sauver le chunk (chunk_1, chunk_2, ...)
	chunkPath := filepath.Join(fileTempDir, fmt.Sprintf("chunk_%d", chunkNumber))
	out, err := os.Create(chunkPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to store chunk"})
		return
	}
	n, err := io.Copy(out, file)
	out.Close()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to write chunk"})
		return
	}
	log.Printf("Chunk %d/%d reçu pour %s (%d octets)", chunkNumber, totalChunks, filename, n)

	// Vérification : nombre de chunks dans le dossier
	files, err := os.ReadDir(fileTempDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to read temp dir"})
		return
	}

	// Si tous les chunks sont là, assembler
	if len(files) == totalChunks {
		// Empêche de lancer le script plusieurs fois en cas de race
		if _, loaded := processLock.LoadOrStore(fileID, true); !loaded {
			finalPath, err := assembleChunks(fileTempDir, filename, totalChunks)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				processLock.Delete(fileID)
				return
			}
			// Optionnel: vérifie la taille finale
			if totalSize > 0 {
				info, err := os.Stat(finalPath)
				if err == nil && info.Size() != totalSize {
					log.Printf("Avertissement: taille finale %d différente de attendue %d", info.Size(), totalSize)
				}
			}
			// Script Python lancé en asynchrone
			processMovieAsync(finalPath)
			processLock.Delete(fileID)
			c.JSON(http.StatusOK, gin.H{
				"status":    "Upload complete, processing started",
				"filename":  filename,
				"path":      finalPath,
				"elapsed_s": time.Since(start).Seconds(),
			})
			return
		} else {
			// Si déjà en cours de traitement, ignorer
			c.JSON(http.StatusOK, gin.H{"status": "Processing already started"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    fmt.Sprintf("Chunk %d/%d uploaded", chunkNumber, totalChunks),
		"chunk_num": chunkNumber,
		"file_id":   fileID,
		"filename":  filename,
		"elapsed_s": time.Since(start).Seconds(),
	})
}
