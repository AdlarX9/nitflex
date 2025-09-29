package main

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// Handler qui sert directement la vidéo en streaming sur /video/:id
func VideoStreamHandler(c *gin.Context) {
	tmdbID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Récupérer le film dans la base de données
	var movie Movie
	err := GetCollection("movies").FindOne(ctx, bson.M{"tmdbID": parseInt(tmdbID)}).Decode(&movie)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Film non trouvé"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		}
		return
	}

	// Exemple : récupération du chemin du fichier vidéo (à adapter selon ta base)
	videoFile := filepath.Join(".", "uploads", movie.CustomTitle)

	// Stream directement la vidéo
	serveVideoStream(videoFile, c)
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
