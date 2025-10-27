package handlers

import (
	"api/utils"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// POST /ongoing_media - idempotent upsert for movie or episode progress and order pin
func UpdateOnGoingMedia(c *gin.Context) {
	var raw map[string]interface{}
	if err := c.ShouldBindJSON(&raw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// parse common fields
	userHex, _ := raw["user"].(string)
	uid, err := primitive.ObjectIDFromHex(userHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user id"})
		return
	}
	tmdbID := intFromAny(raw["tmdbID"])
	duration := intFromAny(raw["duration"])
	position := intFromAny(raw["position"])
	typ, _ := raw["type"].(string)

	ctx, cancel := context.WithTimeout(context.Background(), 7*time.Second)
	defer cancel()

	var mediaDoc bson.M
	medCol := utils.GetCollection("ongoing_medias")

	if typ == "episode" || raw["episode"] != nil {
		epHex, _ := raw["episode"].(string)
		seriesHex, _ := raw["series"].(string)
		epID, err := primitive.ObjectIDFromHex(epHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode id"})
			return
		}
		seriesID, err := primitive.ObjectIDFromHex(seriesHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid series id"})
			return
		}

		// Upsert OnGoingEpisode by (user, episode) atomically
		epFilter := bson.M{"user": uid, "episode": epID}
		epUpdate := bson.M{
			"$set": bson.M{
				"episode":  epID,
				"series":   seriesID,
				"tmdbID":   tmdbID,
				"duration": duration,
				"position": position,
				"user":     uid,
			},
			"$setOnInsert": bson.M{"_id": primitive.NewObjectID()},
		}
		var ep utils.OnGoingEpisode
		if err := utils.GetCollection("ongoing_episodes").FindOneAndUpdate(
			ctx,
			epFilter,
			epUpdate,
			options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
		).Decode(&ep); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
			return
		}

		// Upsert corresponding OnGoingMedia doc atomically and return it
		filter := bson.M{"type": "episode", "id": ep.ID}
		update := bson.M{"$setOnInsert": bson.M{"type": "episode", "id": ep.ID}}
		doc := utils.GetCollection("ongoing_medias").FindOneAndUpdate(ctx, filter, update, options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After))
		if err := doc.Decode(&mediaDoc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Upsert media failed: " + err.Error()})
			return
		}
	} else {
		// movie path
		movieHex, _ := raw["movie"].(string)
		mid, err := primitive.ObjectIDFromHex(movieHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie id"})
			return
		}
		// Upsert OnGoingMovie by (user, movie) atomically
		mvFilter := bson.M{"user": uid, "movie": mid}
		mvUpdate := bson.M{
			"$set": bson.M{
				"movie":    mid,
				"tmdbID":   tmdbID,
				"duration": duration,
				"position": position,
				"user":     uid,
			},
			"$setOnInsert": bson.M{"_id": primitive.NewObjectID()},
		}
		var mv utils.OnGoingMovie
		if err := utils.GetCollection("ongoing_movies").FindOneAndUpdate(
			ctx,
			mvFilter,
			mvUpdate,
			options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
		).Decode(&mv); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
			return
		}
		// Upsert OnGoingMedia
		filter := bson.M{"type": "movie", "id": mv.ID}
		update := bson.M{"$setOnInsert": bson.M{"type": "movie", "id": mv.ID}}
		doc := medCol.FindOneAndUpdate(ctx, filter, update, options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After))
		if err := doc.Decode(&mediaDoc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Upsert media failed: " + err.Error()})
			return
		}
	}

	// Atomically move ogID to front and ensure uniqueness using update pipeline
	usersCol := utils.GetCollection("users")
	ogID, ok := mediaDoc["_id"].(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid media _id type"})
		return
	}

	// Agrégation d'update (MongoDB 4.2+): place ogID en tête et filtre les doublons
	updatePipeline := mongo.Pipeline{
		bson.D{{
			Key: "$set", Value: bson.D{{
				Key: "onGoingMedias", Value: bson.D{{
					Key: "$concatArrays", Value: bson.A{
						bson.A{ogID}, // on met le nouvel ID en tête
						bson.D{{ // on garde les anciens, sauf ogID
							Key: "$filter", Value: bson.D{
								{Key: "input", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$onGoingMedias", bson.A{}}}}},
								// "as" est optionnel; $$this réfère l'élément courant
								{Key: "cond", Value: bson.D{{Key: "$ne", Value: bson.A{"$$this", ogID}}}},
							},
						}},
					},
				}},
			}},
		}},
	}

	res, err := usersCol.UpdateOne(ctx, bson.M{"_id": uid}, updatePipeline /*, options.Update().SetUpsert(false)*/)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Users update failed: " + err.Error()})
		return
	}
	if res.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	fmt.Println("updated user for on going movie", uid)
	c.JSON(http.StatusOK, gin.H{"ok": true, "onGoingMedia": mediaDoc})
}

// GET /ongoing_media/:id - Unified ongoing media for a user (movies and deduped episodes per series)
func GetOnGoingMediaByUserID(c *gin.Context) {
	userID := c.Param("id")
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Load user to get list of ongoing media IDs
	var user utils.User
	if err := utils.GetCollection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	// Fetch ongoing_media docs in user's order
	ids := user.OnGoingMediasID
	if len(ids) == 0 {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}
	cur, err := utils.GetCollection("ongoing_medias").Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	var medias []bson.M
	if err := cur.All(ctx, &medias); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// Build maps for quick lookup
	mediaByID := map[primitive.ObjectID]bson.M{}
	movieIDs := []primitive.ObjectID{}
	episodeDocIDs := []primitive.ObjectID{}
	for _, m := range medias {
		if id, ok := m["_id"].(primitive.ObjectID); ok {
			mediaByID[id] = m
			if m["type"] == "movie" {
				if rid, ok := m["id"].(primitive.ObjectID); ok {
					movieIDs = append(movieIDs, rid)
				}
			} else if m["type"] == "episode" {
				if rid, ok := m["id"].(primitive.ObjectID); ok {
					episodeDocIDs = append(episodeDocIDs, rid)
				}
			}
		}
	}

	// Load underlying docs
	movieByOID := map[primitive.ObjectID]utils.OnGoingMovie{}
	if len(movieIDs) > 0 {
		curM, err := utils.GetCollection("ongoing_movies").Find(ctx, bson.M{"_id": bson.M{"$in": movieIDs}})
		if err == nil {
			var arr []utils.OnGoingMovie
			_ = curM.All(ctx, &arr)
			for _, mv := range arr {
				movieByOID[mv.ID] = mv
			}
		}
	}
	episodeByOID := map[primitive.ObjectID]utils.OnGoingEpisode{}
	if len(episodeDocIDs) > 0 {
		curE, err := utils.GetCollection("ongoing_episodes").Find(ctx, bson.M{"_id": bson.M{"$in": episodeDocIDs}})
		if err == nil {
			var arr []utils.OnGoingEpisode
			_ = curE.All(ctx, &arr)
			for _, ep := range arr {
				episodeByOID[ep.ID] = ep
			}
		}
	}
	// Load episodes metadata for season/episode numbers
	epIDs := []primitive.ObjectID{}
	for _, oe := range episodeByOID {
		epIDs = append(epIDs, oe.EpisodeID)
	}
	epMeta := map[primitive.ObjectID]utils.Episode{}
	if len(epIDs) > 0 {
		cur, err := utils.GetCollection("episodes").Find(ctx, bson.M{"_id": bson.M{"$in": epIDs}})
		if err == nil {
			for cur.Next(ctx) {
				var e utils.Episode
				if err := cur.Decode(&e); err == nil {
					epMeta[e.ID] = e
				}
			}
			cur.Close(ctx)
		}
	}

	// Build response in user's order, skip duplicates if any
	out := make([]gin.H, 0, len(ids))
	seen := map[primitive.ObjectID]bool{}
	for _, oid := range ids {
		if seen[oid] {
			continue
		}
		seen[oid] = true
		m, ok := mediaByID[oid]
		if !ok {
			continue
		}
		t, _ := m["type"].(string)
		rid, _ := m["id"].(primitive.ObjectID)
		if t == "movie" {
			if mv, ok := movieByOID[rid]; ok {
				out = append(out, gin.H{
					"type":     "movie",
					"ogId":     oid.Hex(),
					"id":       mv.ID.Hex(),
					"tmdbID":   mv.TmdbID,
					"position": mv.Position,
					"duration": mv.Duration,
				})
			}
		} else if t == "episode" {
			if oe, ok := episodeByOID[rid]; ok {
				meta := epMeta[oe.EpisodeID]
				out = append(out, gin.H{
					"type":          "episode",
					"ogId":          oid.Hex(),
					"id":            oe.ID.Hex(),
					"episodeId":     oe.EpisodeID.Hex(),
					"seriesId":      oe.SeriesID.Hex(),
					"tmdbID":        oe.TmdbID,
					"seasonNumber":  meta.SeasonNumber,
					"episodeNumber": meta.EpisodeNumber,
					"position":      oe.Position,
					"duration":      oe.Duration,
				})
			}
		}
	}

	c.JSON(http.StatusOK, out)
}

// DELETE /ongoing_media/:id - Delete ongoing media wrapper and underlying progress
func DeleteOnGoingMedia(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 7*time.Second)
	defer cancel()

	// Load media wrapper
	var media bson.M
	if err := utils.GetCollection("ongoing_medias").FindOne(ctx, bson.M{"_id": objID}).Decode(&media); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "OnGoingMedia not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		}
		return
	}
	t, _ := media["type"].(string)
	rid, _ := media["id"].(primitive.ObjectID)

	// Delete underlying progress doc
	if t == "movie" {
		utils.GetCollection("ongoing_movies").DeleteOne(ctx, bson.M{"_id": rid})
	} else if t == "episode" {
		utils.GetCollection("ongoing_episodes").DeleteOne(ctx, bson.M{"_id": rid})
	}

	// Remove wrapper from users then delete wrapper
	utils.GetCollection("users").UpdateMany(ctx, bson.M{"onGoingMedias": objID}, bson.M{"$pull": bson.M{"onGoingMedias": objID}})
	_, _ = utils.GetCollection("ongoing_medias").DeleteOne(ctx, bson.M{"_id": objID})

	c.JSON(http.StatusOK, gin.H{"deleted": 1})
}

// helper: safe int conversion
func intFromAny(v interface{}) int {
	switch t := v.(type) {
	case float64:
		return int(t)
	case int32:
		return int(t)
	case int64:
		return int(t)
	case int:
		return t
	default:
		return 0
	}
}
