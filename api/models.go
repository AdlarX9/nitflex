package main

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID              primitive.ObjectID   `json:"id,omitempty" bson:"_id,omitempty"`
	Name            string               `json:"name" bson:"name"`
	OnGoingMoviesID []primitive.ObjectID `json:"onGoingMovies" bson:"onGoingMovies"`
}

type Movie struct {
	ID          primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	CustomTitle string             `json:"customTitle" bson:"customTitle"`
	Format      string             `json:"format" bson:"format"`
	ImdbID      string             `json:"imdbID" bson:"imdbID"`
	TmdbID      int                `json:"tmdbID" bson:"tmdbID"`
	Date        primitive.DateTime `json:"date" bson:"date"`
	Poster      string             `json:"poster" bson:"poster"`
	Rating      float64            `json:"rating,omitempty" bson:"rating,omitempty"`
}

type OnGoingMovie struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	MovieID  primitive.ObjectID `json:"movie" bson:"movie"`
	TmdbID   int                `json:"tmdbID" bson:"tmdbID"`
	Duration int                `json:"duration" bson:"duration"` // en secondes
	Position int                `json:"position" bson:"position"` // en secondes
	UserID   primitive.ObjectID `json:"user" bson:"user"`
}

type MovieQuery struct {
	Title   string `form:"title" json:"title" bson:"title"`
	Genre   string `form:"genre" json:"genre" bson:"genre"`
	OrderBy string `form:"orderBy" json:"orderBy" bson:"orderBy"`
	Limit   int    `form:"limit" json:"limit" bson:"limit"`
}
