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
	ImdbID      string             `json:"imdbID" bson:"imdbID"`
	Genre       string             `json:"genre" bson:"genre"`
	Date        primitive.DateTime `json:"date" bson:"date"`
	Year        uint16             `json:"year" bson:"year"`
	Rating      float64            `json:"rating" bson:"rating"`
	Description string             `json:"description" bson:"description"`
	Actors      []string           `json:"actors" bson:"actors"`
	Writers     []string           `json:"writers" bson:"writers"`
	Realisator  string             `json:"realisator" bson:"realisator"`
	Poster      string             `json:"poster" bson:"poster"`
	BoxOffice   string             `json:"boxOffice" bson:"boxOffice"`
	Countries   []string           `json:"countries" bson:"countries"`
	Awards      string             `json:"awards" bson:"awards"`
	Type        string             `json:"type" bson:"type"`
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
