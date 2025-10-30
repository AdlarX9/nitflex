package utils

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID                primitive.ObjectID   `json:"id,omitempty" bson:"_id,omitempty"`
	Name              string               `json:"name" bson:"name"`
	OnGoingMediasID   []primitive.ObjectID `json:"onGoingMedias" bson:"onGoingMedias"`
}

type OnGoingMedia struct {
	Type string `json:"type" bson:"type"` // "movie" | "episode"
	ID   primitive.ObjectID `json:"id" bson:"id,omitempty"` // MovieID or EpisodeID
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
	ID          primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	CustomTitle string             `json:"-" bson:"customTitle,omitempty"`
	TmdbID      int                `json:"tmdbID" bson:"tmdbID"`
	ImdbID      string             `json:"imdbID,omitempty" bson:"imdbID,omitempty"`
	Poster      string             `json:"poster" bson:"poster"`
	Date        primitive.DateTime `json:"date" bson:"date"` // When added to library
	Seasons     []Season           `json:"seasons" bson:"seasons"`
}

// Season represents a season within a series
type Season struct {
	ID           primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	SeriesID     primitive.ObjectID `json:"seriesID" bson:"seriesID"`
	SeasonNumber int                `json:"seasonNumber" bson:"seasonNumber"`
	FolderName   string             `json:"folderName" bson:"folderName"`
	Episodes     []Episode          `json:"episodes" bson:"episodes"`
}

// Episode represents an episode
type Episode struct {
	ID            primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	TmdbID        int                `json:"tmdbID" bson:"tmdbID"`
	EpisodeNumber int                `json:"episodeNumber" bson:"episodeNumber"`
	SeasonNumber  int                `json:"seasonNumber" bson:"seasonNumber"`
	SeriesID      primitive.ObjectID `json:"seriesID" bson:"seriesID"`
	Title         string             `json:"title" bson:"title"`
	Runtime       int                `json:"runtime,omitempty" bson:"runtime,omitempty"` // Minutes
	FilePath      string             `json:"filePath" bson:"filePath"`                   // Actual video file location
	Date          primitive.DateTime `json:"date" bson:"date"` // When added to library
}

// OnGoingEpisode for episode progress tracking
type OnGoingEpisode struct {
	ID        primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	EpisodeID primitive.ObjectID `json:"episode" bson:"episode"`
	SeriesID  primitive.ObjectID `json:"series" bson:"series"`
	TmdbID    int                `json:"tmdbID" bson:"tmdbID"`     // Series TMDB ID
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
