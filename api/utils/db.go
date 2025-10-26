package utils

import (
	"context"
	"log"
	"os"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoClient *mongo.Client
	Once        sync.Once
)

func GetMongoClient() *mongo.Client {
	Once.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Get MongoDB URI from environment or use default
		mongoURI := os.Getenv("MONGODB_URI")
		if mongoURI == "" {
			mongoURI = "mongodb://localhost:27017"
		}

		client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
		if err != nil {
			log.Fatal(err)
		}
		MongoClient = client
	})
	return MongoClient
}

func GetDatabase() *mongo.Database {
	client := GetMongoClient()
	return client.Database("nitflex_db")
}

func GetCollection(collection string) *mongo.Collection {
	return GetDatabase().Collection(collection)
}
