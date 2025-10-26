package handlers

import (
	"api/utils"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

/* --- OnGoingMovies --- */

// POST /ongoing_movies
func UpdateOnGoingMovie(c *gin.Context) {
	var onGoingMovie utils.OnGoingMovie
	if err := c.ShouldBindJSON(&onGoingMovie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données JSON invalides ou absentes : " + err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"user":  onGoingMovie.UserID,
		"movie": onGoingMovie.MovieID,
	}

	var existing utils.OnGoingMovie
	errFind := utils.GetCollection("ongoing_movies").FindOne(ctx, filter).Decode(&existing)
	if errFind == nil {
		onGoingMovie.ID = existing.ID
	} else if errFind != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur MongoDB : " + errFind.Error()})
		return
	} else {
		onGoingMovie.ID = primitive.NewObjectID()
	}

	updateOptions := options.Update().SetUpsert(true)
	idFilter := bson.M{"_id": onGoingMovie.ID}
	update := bson.M{"$set": onGoingMovie}

	_, err := utils.GetCollection("ongoing_movies").UpdateOne(ctx, idFilter, update, updateOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur MongoDB : " + err.Error()})
		return
	}

	usersCol := utils.GetCollection("users")

	// 1) Retire l'ID s'il existait déjà
	if _, err := usersCol.UpdateOne(
		ctx,
		bson.M{"_id": onGoingMovie.UserID},
		bson.M{"$pull": bson.M{"onGoingMovies": onGoingMovie.ID}},
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur MongoDB user (pull) : " + err.Error()})
		return
	}

	// 2) Push en position 0
	if _, err := usersCol.UpdateOne(
		ctx,
		bson.M{"_id": onGoingMovie.UserID},
		bson.M{
			"$push": bson.M{
				"onGoingMovies": bson.M{
					"$each":     bson.A{onGoingMovie.ID},
					"$position": 0,
				},
			},
		},
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur MongoDB user (push) : " + err.Error()})
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

	// 1. Suppression du film en cours
	delRes, err := utils.GetCollection("ongoing_movies").DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la suppression : " + err.Error()})
		return
	}
	if delRes.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film en cours non trouvé", "id": id})
		return
	}

	// 2. Retirer l'ObjectID des utilisateurs
	userUpdateRes, err := utils.GetCollection("users").UpdateMany(
		ctx,
		bson.M{"onGoingMovies": objID},
		bson.M{"$pull": bson.M{"onGoingMovies": objID}},
	)
	if err != nil {
		// Ici le film est déjà supprimé. On signale l’erreur.
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":         "Film supprimé mais erreur lors de la mise à jour des utilisateurs : " + err.Error(),
			"deleted":       delRes.DeletedCount,
			"usersModified": 0,
			"orphanMovieID": id,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"deleted":       delRes.DeletedCount,
		"usersMatched":  userUpdateRes.MatchedCount,
		"usersModified": userUpdateRes.ModifiedCount,
	})
}

// DELETE /all_ongoing_movies
func DeleteAllOnGoingMovies(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := utils.GetCollection("ongoing_movies").DeleteMany(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la suppression : " + err.Error()})
		return
	}
	_, errUser := utils.GetCollection("users").UpdateMany(ctx, bson.M{}, bson.M{"$set": bson.M{"onGoingMovies": []primitive.ObjectID{}}})
	if errUser != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la mise à jour des utilisateurs : " + errUser.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": res.DeletedCount})
}

// GET /ongoing_movies/:id
func GetOnGoingMovieByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID invalide"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var onGoingMovie utils.OnGoingMovie
	err = utils.GetCollection("ongoing_movies").FindOne(ctx, bson.M{"_id": objID}).Decode(&onGoingMovie)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Film en cours non trouvé", "id": id})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		}
		return
	}

	c.JSON(http.StatusOK, onGoingMovie)
}

/* --- OnGoingEpisodes --- */

// POST /ongoing_episodes - Update episode progress
func UpdateOnGoingEpisode(c *gin.Context) {
	var onGoingEpisode utils.OnGoingEpisode
	if err := c.ShouldBindJSON(&onGoingEpisode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"user":    onGoingEpisode.UserID,
		"episode": onGoingEpisode.EpisodeID,
	}

	var existing utils.OnGoingEpisode
	errFind := utils.GetCollection("ongoing_episodes").FindOne(ctx, filter).Decode(&existing)
	if errFind == nil {
		onGoingEpisode.ID = existing.ID
	} else if errFind != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + errFind.Error()})
		return
	} else {
		onGoingEpisode.ID = primitive.NewObjectID()
	}

	updateOptions := options.Update().SetUpsert(true)
	idFilter := bson.M{"_id": onGoingEpisode.ID}
	update := bson.M{"$set": onGoingEpisode}

	_, err := utils.GetCollection("ongoing_episodes").UpdateOne(ctx, idFilter, update, updateOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// Update user's ongoing episodes list
	usersCol := utils.GetCollection("users")

	// Remove if exists
	usersCol.UpdateOne(
		ctx,
		bson.M{"_id": onGoingEpisode.UserID},
		bson.M{"$pull": bson.M{"onGoingEpisodes": onGoingEpisode.ID}},
	)

	// Push to position 0
	usersCol.UpdateOne(
		ctx,
		bson.M{"_id": onGoingEpisode.UserID},
		bson.M{
			"$push": bson.M{
				"onGoingEpisodes": bson.M{
					"$each":     bson.A{onGoingEpisode.ID},
					"$position": 0,
				},
			},
		},
	)

	c.JSON(http.StatusOK, onGoingEpisode)
}

// GET /ongoing_episodes/:id - Get episode progress
func GetOnGoingEpisodeByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var onGoingEpisode utils.OnGoingEpisode
	err = utils.GetCollection("ongoing_episodes").FindOne(ctx, bson.M{"_id": objID}).Decode(&onGoingEpisode)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode progress not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	c.JSON(http.StatusOK, onGoingEpisode)
}

// DELETE /ongoing_episodes/:id - Delete episode progress
func DeleteOnGoingEpisode(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Delete ongoing episode
	delRes, err := utils.GetCollection("ongoing_episodes").DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete: " + err.Error()})
		return
	}

	if delRes.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode progress not found"})
		return
	}

	// Remove from users
	utils.GetCollection("users").UpdateMany(
		ctx,
		bson.M{"onGoingEpisodes": objID},
		bson.M{"$pull": bson.M{"onGoingEpisodes": objID}},
	)

	c.JSON(http.StatusOK, gin.H{"message": "Episode progress deleted", "deleted": delRes.DeletedCount})
}
