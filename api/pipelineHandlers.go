package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func fetchMovie(tmdbID int, ch chan<- Movie) {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		fmt.Println("Erreur : la clé API TMDB_API_KEY n'est pas définie")
		ch <- Movie{}
		return
	}

	// Requête pour récupérer les détails du film TMDB
	detailsURL := fmt.Sprintf("https://api.themoviedb.org/3/movie/%d?api_key=%s", tmdbID, apiKey)
	fmt.Printf("Requête HTTP TMDB details: %s\n", detailsURL)
	detailsResp, err := http.Get(detailsURL)
	if err != nil {
		fmt.Printf("Erreur lors de la requête TMDB details pour %d : %v\n", tmdbID, err)
		ch <- Movie{}
		return
	}
	defer detailsResp.Body.Close()
	if detailsResp.StatusCode != http.StatusOK {
		fmt.Printf("Erreur HTTP TMDB details pour %d : statut %d\n", tmdbID, detailsResp.StatusCode)
		ch <- Movie{}
		return
	}
	var details struct {
		Title      string `json:"title"`
		PosterPath string `json:"poster_path"`
		ImdbID     string `json:"imdb_id"`
	}
	if err := json.NewDecoder(detailsResp.Body).Decode(&details); err != nil {
		fmt.Printf("Erreur lors du décodage JSON TMDB details pour %d : %v\n", tmdbID, err)
		ch <- Movie{}
		return
	}

	// Créer l'objet Movie avec les champs mappés
	movie := Movie{
		ID:     primitive.NewObjectID(),
		Title:  details.Title,
		ImdbID: details.ImdbID,
		Date:   primitive.NewDateTimeFromTime(time.Now()),
		Poster: details.PosterPath,
		TmdbID: tmdbID,
		Format: "mp4", // Valeur par défaut
	}

	// Envoyer le film mis à jour dans le canal
	ch <- movie
}

func parseInt(s string) int {
	var i int
	fmt.Sscanf(s, "%d", &i)
	return i
}

// POST /movies/upload
func UploadMovie(c *gin.Context) {
	// Récupération des métadonnées
	customTitle := c.PostForm("customTitle")
	tmdbIDString := c.PostForm("tmdbID")
	processingLocation := c.PostForm("processingLocation") // "local" or "server"
	mediaType := c.PostForm("type")                        // "movie" or "series"
	if processingLocation == "" {
		processingLocation = "server" // Default to server processing
	}

	if mediaType == "series" {
		if customTitle == "" {
			c.JSON(400, gin.H{"error": "customTitle is required"})
			return
		}
	} else {
		if customTitle == "" || tmdbIDString == "" {
			fmt.Printf("métadonnées manquantes : %s et %s\n", customTitle, tmdbIDString)
			c.JSON(400, gin.H{"error": "customTitle and tmdbID are required"})
			return
		}
	}

	var ch chan Movie
	if mediaType != "series" {
		tmdbID := parseInt(tmdbIDString)
		fmt.Printf("TMDB ID String: %s, Parsed ID: %d\n", tmdbIDString, tmdbID)
		ch = make(chan Movie, 1)
		go fetchMovie(tmdbID, ch)
	}

	// Récupération du fichier
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": fmt.Sprintf("Failed to get file: %s", err.Error())})
		return
	}
	defer file.Close()

	// Définir le chemin de destination
	dst := filepath.Join(".", "uploads", customTitle)

	// Créer le fichier de destination
	out, err := os.Create(dst)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to create file: %s", err.Error())})
		return
	}
	defer out.Close()

	// Copier les données du fichier dans le fichier de destination
	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to write file: %s", err.Error())})
		return
	}

	var movie Movie
	if mediaType == "series" {
		movie = Movie{
			ID:          primitive.NewObjectID(),
			CustomTitle: customTitle,
			FilePath:    dst,
			Date:        primitive.NewDateTimeFromTime(time.Now()),
			Format:      filepath.Ext(dst),
		}
	} else {
		movie = <-ch
		movie.CustomTitle = customTitle
		// Save actual uploaded file location for downstream jobs
		movie.FilePath = dst
	}

	// If this upload is for a series episode, skip inserting into movies collection
	if mediaType == "series" {
		c.JSON(200, gin.H{
			"url":                fmt.Sprintf("http://localhost:8080/uploads/%s", header.Filename),
			"movie":              movie,
			"processingLocation": processingLocation,
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := GetCollection("movies").InsertOne(ctx, movie)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		movie.ID = oid // Assigne l'ID généré par MongoDB
	} else {
		c.JSON(500, gin.H{"error": "Failed to cast InsertedID to ObjectID"})
		return
	}

	// Répondre avec une URL JSON
	c.JSON(200, gin.H{
		"url":                fmt.Sprintf("http://localhost:8080/uploads/%s", header.Filename),
		"movie":              movie,
		"processingLocation": processingLocation,
	})

	// Only process on server if requested (legacy path)
	if processingLocation == "server" && mediaType != "series" {
		go func(movie Movie) {
			jsonMovie, err := json.Marshal(movie)
			if err != nil {
				fmt.Printf("Erreur lors du marshalling JSON : %v\n", err)
				return
			}
			pythonScript := "./scripts/transform_movie.py"
			args := []string{pythonScript, string(jsonMovie)}
			cmd := exec.Command("python3", args...)
			cmd.Dir = "."

			// Simuler une tâche longue
			time.Sleep(5 * time.Second)

			// Exécuter la commande
			output, err := cmd.CombinedOutput()

			// Mettre à jour l'état de la tâche
			mu.Lock()
			task := Task{}
			tasks = append(tasks, &task)
			mu.Unlock()

			if err != nil {
				mu.Lock()
				task.Status = "Erreur"
				task.Output = fmt.Sprintf("Erreur : %v\n%s", err, string(output))
				mu.Unlock()
				fmt.Printf("Erreur traitement vidéo : %v\n", err)
				return
			}

			// Parse JSON output from Python script
			var result map[string]interface{}
			if err := json.Unmarshal(output, &result); err == nil {
				if success, ok := result["success"].(bool); ok && success {
					mu.Lock()
					task.Status = "Terminé"
					task.Output = fmt.Sprintf("Fichier traité : %s", result["output_path"])
					mu.Unlock()
				} else {
					mu.Lock()
					task.Status = "Erreur"
					task.Output = fmt.Sprintf("Erreur : %s", result["error"])
					mu.Unlock()
				}
			} else {
				mu.Lock()
				task.Status = "Terminé"
				task.Output = string(output)
				mu.Unlock()
			}
		}(movie)
	}
}

// GET /tasks
func getTasks(c *gin.Context) {
	mu.Lock()
	defer mu.Unlock()
	c.JSON(200, tasks)
}
