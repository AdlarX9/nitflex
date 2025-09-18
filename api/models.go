package main

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID              primitive.ObjectID   `json:"id,omitempty" bson:"_id,omitempty"`
	Name            string               `json:"name" bson:"name"`
	OnGoingMoviesID []primitive.ObjectID `json:"onGoingMovies" bson:"onGoingMovies"`
}

type Movie struct {
	ID              primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title           string             `json:"title" bson:"title"`
	Genre           string             `json:"genre" bson:"genre"`
	Date            primitive.DateTime `json:"date" bson:"date"`
	Rating          float64            `json:"rating" bson:"rating"`
	Description     string             `json:"description" bson:"description"`
	LongDescription string             `json:"longDescription" bson:"longDescription"`
	Actors          []string           `json:"actors" bson:"actors"`
	Realisator      string             `json:"realisator" bson:"realisator"`
}

type OnGoingMovie struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	MovieID  primitive.ObjectID `json:"movie" bson:"movie"`
	Duration int                `json:"duration" bson:"duration"`
}

type MovieQuery struct {
	Title   string `form:"title" json:"title" bson:"title"`
	Genre   string `form:"genre" json:"genre" bson:"genre"`
	OrderBy string `form:"orderBy" json:"orderBy" bson:"orderBy"`
	Limit   int    `form:"limit" json:"limit" bson:"limit"`
}
