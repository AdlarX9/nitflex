package main

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID                primitive.ObjectID   `json:"id,omitempty" bson:"_id,omitempty"`
	Name              string               `json:"name" bson:"name"`
	OnGoingMoviesID   []primitive.ObjectID `json:"onGoingMovies" bson:"onGoingMovies"`
	OnGoingEpisodesID []primitive.ObjectID `json:"onGoingEpisodes" bson:"onGoingEpisodes"`
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
	FilePath    string             `json:"filePath" bson:"filePath"` // Actual file location
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

// Series represents a TV show
type Series struct {
	ID           primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title        string             `json:"title" bson:"title"`
	TmdbID       int                `json:"tmdbID" bson:"tmdbID"`
	ImdbID       string             `json:"imdbID,omitempty" bson:"imdbID,omitempty"`
	Poster       string             `json:"poster" bson:"poster"`
	Backdrop     string             `json:"backdrop,omitempty" bson:"backdrop,omitempty"`
	Overview     string             `json:"overview,omitempty" bson:"overview,omitempty"`
	FirstAirDate primitive.DateTime `json:"firstAirDate,omitempty" bson:"firstAirDate,omitempty"`
	LastAirDate  primitive.DateTime `json:"lastAirDate,omitempty" bson:"lastAirDate,omitempty"`
	Status       string             `json:"status,omitempty" bson:"status,omitempty"`
	SeasonCount  int                `json:"seasonCount" bson:"seasonCount"`
	EpisodeCount int                `json:"episodeCount" bson:"episodeCount"`
	Date         primitive.DateTime `json:"date" bson:"date"` // When added to library
}

// Season represents a season within a series
type Season struct {
	ID           primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	SeriesID     primitive.ObjectID `json:"seriesID" bson:"seriesID"`
	TmdbID       int                `json:"tmdbID" bson:"tmdbID"`
	SeasonNumber int                `json:"seasonNumber" bson:"seasonNumber"`
	Name         string             `json:"name" bson:"name"`
	Poster       string             `json:"poster,omitempty" bson:"poster,omitempty"`
	Overview     string             `json:"overview,omitempty" bson:"overview,omitempty"`
	AirDate      primitive.DateTime `json:"airDate,omitempty" bson:"airDate,omitempty"`
	EpisodeCount int                `json:"episodeCount" bson:"episodeCount"`
}

// Episode represents an episode
type Episode struct {
	ID            primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	SeriesID      primitive.ObjectID `json:"seriesID" bson:"seriesID"`
	SeasonID      primitive.ObjectID `json:"seasonID" bson:"seasonID"`
	TmdbID        int                `json:"tmdbID" bson:"tmdbID"`
	EpisodeNumber int                `json:"episodeNumber" bson:"episodeNumber"`
	SeasonNumber  int                `json:"seasonNumber" bson:"seasonNumber"`
	Title         string             `json:"title" bson:"title"`
	Overview      string             `json:"overview,omitempty" bson:"overview,omitempty"`
	StillPath     string             `json:"stillPath,omitempty" bson:"stillPath,omitempty"` // Episode poster
	AirDate       primitive.DateTime `json:"airDate,omitempty" bson:"airDate,omitempty"`
	Runtime       int                `json:"runtime,omitempty" bson:"runtime,omitempty"` // Minutes
	FilePath      string             `json:"filePath" bson:"filePath"`                   // Actual video file location
	Format        string             `json:"format" bson:"format"`
	CustomTitle   string             `json:"customTitle,omitempty" bson:"customTitle,omitempty"`
	Date          primitive.DateTime `json:"date" bson:"date"` // When added to library
}

// OnGoingEpisode for episode progress tracking
type OnGoingEpisode struct {
	ID        primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	EpisodeID primitive.ObjectID `json:"episode" bson:"episode"`
	SeriesID  primitive.ObjectID `json:"series" bson:"series"`
	TmdbID    int                `json:"tmdbID" bson:"tmdbID"`     // Episode TMDB ID
	Duration  int                `json:"duration" bson:"duration"` // Seconds
	Position  int                `json:"position" bson:"position"` // Seconds
	UserID    primitive.ObjectID `json:"user" bson:"user"`
}

// Job represents a transcoding/processing job
type Job struct {
	ID               primitive.ObjectID     `json:"id,omitempty" bson:"_id,omitempty"`
	Type             string                 `json:"type" bson:"type"`                           // "movie" | "episode"
	MediaID          primitive.ObjectID     `json:"mediaID,omitempty" bson:"mediaID,omitempty"` // MovieID or EpisodeID
	TmdbID           int                    `json:"tmdbID" bson:"tmdbID"`
	Stage            string                 `json:"stage" bson:"stage"`                 // queued, transcoding, tagging, moving, completed, failed, canceled
	Progress         float64                `json:"progress" bson:"progress"`           // 0-100
	ETA              int                    `json:"eta,omitempty" bson:"eta,omitempty"` // Seconds remaining
	ErrorMessage     string                 `json:"errorMessage,omitempty" bson:"errorMessage,omitempty"`
	InputPath        string                 `json:"inputPath" bson:"inputPath"`
	OutputPath       string                 `json:"outputPath,omitempty" bson:"outputPath,omitempty"`
	TranscodeMode    string                 `json:"transcodeMode" bson:"transcodeMode"` // "local" | "server" | "none"
	TranscodeOptions map[string]interface{} `json:"transcodeOptions,omitempty" bson:"transcodeOptions,omitempty"`
	CreatedAt        primitive.DateTime     `json:"createdAt" bson:"createdAt"`
	UpdatedAt        primitive.DateTime     `json:"updatedAt" bson:"updatedAt"`
	CompletedAt      primitive.DateTime     `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
}
