package tmdb

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

var apiKey string

func init() {
	apiKey = os.Getenv("TMDB_API_KEY")
}

// SeriesDetails represents TMDB TV show details
type SeriesDetails struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Overview     string `json:"overview"`
	PosterPath   string `json:"poster_path"`
	BackdropPath string `json:"backdrop_path"`
	FirstAirDate string `json:"first_air_date"`
	LastAirDate  string `json:"last_air_date"`
	Status       string `json:"status"`
	NumSeasons   int    `json:"number_of_seasons"`
	NumEpisodes  int    `json:"number_of_episodes"`
	ExternalIDs  struct {
		ImdbID string `json:"imdb_id"`
	} `json:"external_ids"`
}

// SeasonDetails represents a season
type SeasonDetails struct {
	ID           int    `json:"id"`
	SeasonNumber int    `json:"season_number"`
	Name         string `json:"name"`
	Overview     string `json:"overview"`
	PosterPath   string `json:"poster_path"`
	AirDate      string `json:"air_date"`
	EpisodeCount int    `json:"episode_count"`
	Episodes     []EpisodeDetails `json:"episodes"`
}

// EpisodeDetails represents an episode
type EpisodeDetails struct {
	ID            int     `json:"id"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview"`
	EpisodeNumber int     `json:"episode_number"`
	SeasonNumber  int     `json:"season_number"`
	StillPath     string  `json:"still_path"`
	AirDate       string  `json:"air_date"`
	Runtime       int     `json:"runtime"`
	VoteAverage   float64 `json:"vote_average"`
}

// FetchSeries fetches TV show details from TMDB
func FetchSeries(tmdbID int) (*SeriesDetails, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY not configured")
	}

	url := fmt.Sprintf("https://api.themoviedb.org/3/tv/%d?api_key=%s&append_to_response=external_ids", tmdbID, apiKey)
	
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch series: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var series SeriesDetails
	if err := json.Unmarshal(body, &series); err != nil {
		return nil, fmt.Errorf("failed to parse series: %w", err)
	}

	return &series, nil
}

// FetchSeason fetches season details from TMDB
func FetchSeason(seriesTmdbID, seasonNumber int) (*SeasonDetails, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY not configured")
	}

	url := fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/season/%d?api_key=%s", seriesTmdbID, seasonNumber, apiKey)
	
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch season: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var season SeasonDetails
	if err := json.Unmarshal(body, &season); err != nil {
		return nil, fmt.Errorf("failed to parse season: %w", err)
	}

	return &season, nil
}

// FetchEpisode fetches episode details from TMDB
func FetchEpisode(seriesTmdbID, seasonNumber, episodeNumber int) (*EpisodeDetails, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY not configured")
	}

	url := fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/season/%d/episode/%d?api_key=%s", 
		seriesTmdbID, seasonNumber, episodeNumber, apiKey)
	
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch episode: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var episode EpisodeDetails
	if err := json.Unmarshal(body, &episode); err != nil {
		return nil, fmt.Errorf("failed to parse episode: %w", err)
	}

	return &episode, nil
}

// ParseDate parses TMDB date string to time.Time
func ParseDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, nil
	}
	return time.Parse("2006-01-02", dateStr)
}

// DownloadPoster downloads a poster/image from TMDB
func DownloadPoster(posterPath, outputPath string) error {
	if posterPath == "" {
		return fmt.Errorf("poster path is empty")
	}

	url := fmt.Sprintf("https://image.tmdb.org/t/p/original%s", posterPath)
	
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download poster: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download poster, status: %d", resp.StatusCode)
	}

	// Read image data
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read poster data: %w", err)
	}

	// Write to file
	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write poster file: %w", err)
	}

	return nil
}
