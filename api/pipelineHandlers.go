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
	"strings"

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
		Title       string `json:"title"`
		PosterPath  string `json:"poster_path"`
		ImdbID      string `json:"imdb_id"`
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
	compressOnServer := strings.ToLower(c.PostForm("compressOnServer")) == "true"
	if customTitle == "" || tmdbIDString == "" {
		fmt.Printf("métadonnées manquantes : %s et %s\n", customTitle, tmdbIDString)
		c.JSON(400, gin.H{"error": "customTitle and tmdbID are required"})
		return
	}

	tmdbID := parseInt(tmdbIDString)
	fmt.Printf("TMDB ID String: %s, Parsed ID: %d\n", tmdbIDString, tmdbID)
	ch := make(chan Movie, 1)
	go fetchMovie(tmdbID, ch)

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

	movie := <-ch
	movie.CustomTitle = customTitle

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

	// Répondre avec une URL JSON (exemple d'URL fictive)
	c.JSON(200, gin.H{
		"url":   fmt.Sprintf("http://localhost:8080/uploads/%s", header.Filename),
		"movie": movie,
	})

	if (compressOnServer) {
	go func(movie Movie) {
		jsonMovie, err := json.Marshal(movie)
		if err != nil {
			fmt.Printf("Erreur lors du marshalling JSON : %v\n", err)
			return
		}
		pythonScript := "script.py"
		args := []string{string(jsonMovie)}
		cmd := exec.Command("python3", append([]string{pythonScript}, args...)...)

		// Simuler une tâche longue
		time.Sleep(5 * time.Second)

		// Exécuter la commande
		output, err := cmd.CombinedOutput()

		// Mettre à jour l'état de la tâche
		mu.Lock()
		task := Task{}
		tasks = append(tasks, &task)
		if err != nil {
			task.Status = "Erreur"
			task.Output = fmt.Sprintf("Erreur : %v", err)
			mu.Unlock()
			return
		}

		// Stocker la vidéo sur le Serveur
		// ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		// defer cancel()

		task.Status = "Terminé"
		task.Output = string(output)
		mu.Unlock()
	}(movie)
	}
}

// GET /tasks
func getTasks(c *gin.Context) {
	mu.Lock()
	defer mu.Unlock()
	c.JSON(200, tasks)
}