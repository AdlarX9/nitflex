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
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Task struct {
	Status string
	Output string
}

var (
	tasks = make([]*Task, 0) // Slice pour stocker les tâches
	mu    sync.Mutex         // Mutex pour éviter les conflits d'accès
)

// POST /ongoing_movies
func UpdateOnGoingMovie(c *gin.Context) {
	var onGoingMovie OnGoingMovie
	if err := c.ShouldBindJSON(&onGoingMovie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Ajout de l'option upsert
	updateOptions := options.Update().SetUpsert(true)

	_, err := GetCollection("ongoing_movies").UpdateOne(
		ctx,
		bson.M{"_id": onGoingMovie.ID},
		bson.M{"$set": onGoingMovie},
		updateOptions,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, onGoingMovie)
}

// DELETE /ongoing_movies/:id
func DeleteOnGoingMovie(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID invalide"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := GetCollection("ongoing_movies").DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil || res.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Suppression impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": res.DeletedCount})
}

func fetchMovie(imdbID string, ch chan<- Movie) {
	apiKey := os.Getenv("OMDB_API_KEY")
	if apiKey == "" {
		fmt.Println("Erreur : la clé API OMDB_API_KEY n'est pas définie")
		ch <- Movie{}
		return
	}

	// Construire l'URL de la requête
	url := fmt.Sprintf("http://www.omdbapi.com/?i=%s&apikey=%s", imdbID, apiKey)

	fmt.Printf("Requête HTTP pour %s : %s\n", imdbID, url)

	// Faire la requête HTTP GET
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("Erreur lors de la requête pour %s : %v\n", imdbID, err)
		ch <- Movie{}
		return
	}
	defer resp.Body.Close()

	// Vérifier le statut HTTP
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Erreur HTTP pour %s : statut %d\n", imdbID, resp.StatusCode)
		ch <- Movie{}
		return
	}

	// Structure pour parser la réponse JSON de l'API OMDB
	var omdbResponse struct {
		Title      string `json:"Title"`
		Year       string `json:"Year"`
		Genre      string `json:"Genre"`
		Plot       string `json:"Plot"`
		Actors     string `json:"Actors"`
		Director   string `json:"Director"`
		ImdbRating string `json:"imdbRating"`
		Poster     string `json:"Poster"`
		BoxOffice  string `json:"BoxOffice"`
		Countries  string `json:"Country"`
		Awards     string `json:"Awards"`
		Writers    string `json:"Writer"`
		Type       string `json:"Type"`
	}

	// Décoder la réponse JSON
	if err := json.NewDecoder(resp.Body).Decode(&omdbResponse); err != nil {
		fmt.Printf("Erreur lors du décodage JSON pour %s : %v\n", imdbID, err)
		ch <- Movie{}
		return
	}

	// Convertir les champs pour les mapper à Movie
	year, _ := parseYear(omdbResponse.Year)
	rating, _ := parseFloat(omdbResponse.ImdbRating)
	actors := strings.Split(omdbResponse.Actors, ", ")

	// Créer l'objet Movie avec les champs mappés
	movie := Movie{
		ID:          primitive.NewObjectID(),
		Title:       omdbResponse.Title,
		ImdbID:      imdbID,
		Genre:       omdbResponse.Genre,
		Date:        primitive.NewDateTimeFromTime(time.Now()),
		Year:        year,
		Rating:      rating,
		Description: omdbResponse.Plot,
		Actors:      actors,
		Writers:     strings.Split(omdbResponse.Writers, ", "),
		Realisator:  omdbResponse.Director,
		Poster:      omdbResponse.Poster,
		BoxOffice:   omdbResponse.BoxOffice,
		Countries:   strings.Split(omdbResponse.Countries, ", "),
		Awards:      omdbResponse.Awards,
		Type:        omdbResponse.Type,
	}

	// Envoyer le film mis à jour dans le canal
	ch <- movie
}

// parseYear convertit une chaîne de caractères (année) en uint16
func parseYear(yearStr string) (uint16, error) {
	var year uint16
	_, err := fmt.Sscanf(yearStr, "%d", &year)
	return year, err
}

// parseFloat convertit une chaîne de caractères en float64
func parseFloat(floatStr string) (float64, error) {
	var value float64
	_, err := fmt.Sscanf(floatStr, "%f", &value)
	return value, err
}

// POST /movies/upload
func UploadMovie(c *gin.Context) {
	// Récupération des métadonnées
	customTitle := c.PostForm("customTitle")
	imdbID := c.PostForm("imdbID")
	if customTitle == "" || imdbID == "" {
		c.JSON(400, gin.H{"error": "customTitle and imdbID are required"})
		return
	}

	ch := make(chan Movie, 1)
	go fetchMovie(imdbID, ch)

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

// GET /tasks
func getTasks(c *gin.Context) {
	mu.Lock()
	defer mu.Unlock()
	c.JSON(200, tasks)
}

// GET /movies
func GetMovies(c *gin.Context) {
	// Lecture du body JSON
	var query MovieQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if query.Genre != "" {
		filter["genre"] = query.Genre
	}
	if query.Title != "" {
		// Recherche insensible à la casse et partielle
		filter["title"] = bson.M{
			"$regex":   query.Title,
			"$options": "i",
		}
	}

	// Par défaut, trie par date décroissante
	sort := bson.D{{Key: "date", Value: -1}}
	if query.OrderBy != "" {
		orderParts := strings.Split(query.OrderBy, ":")
		if len(orderParts) == 2 {
			field := orderParts[0]
			dir := -1
			if strings.ToLower(orderParts[1]) == "asc" {
				dir = 1
			}
			sort = bson.D{{Key: field, Value: dir}}
		}
	}

	limit := int64(50)
	if query.Limit > 0 {
		limit = int64(query.Limit)
	}

	opts := options.Find().SetSort(sort).SetLimit(limit)

	cursor, err := GetCollection("movies").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var movies []Movie
	if err := cursor.All(ctx, &movies); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movies)
}

func GetAllMovies(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := GetCollection("movies").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var movies []Movie
	if err := cursor.All(ctx, &movies); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movies)
}

// GET /movies/:id
func GetMovieByID(c *gin.Context) {
	id := c.Param("id")

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var movie Movie
	err = GetCollection("movies").FindOne(ctx, bson.M{"_id": objID}).Decode(&movie)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(404, gin.H{"error": "Movie not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, movie)
}
