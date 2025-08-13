package main

import (
	"context"
	"log"
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
		client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
		if err != nil {
			log.Fatal(err)
		}
		MongoClient = client
	})
	return MongoClient
}

func GetCollection(collection string) *mongo.Collection {
	client := GetMongoClient()
	return client.Database("nitflex_db").Collection(collection)
}
