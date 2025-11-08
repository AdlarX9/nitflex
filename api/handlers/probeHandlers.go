package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ProbeStreams accepts a temporary uploaded file and returns detected audio and subtitle streams
// POST /probe_streams (multipart: file)
func ProbeStreams(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	src, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to open file"})
		return
	}
	defer src.Close()

	// Save to temp file (safer/easier than piping entire blob)
	tmpDir := os.TempDir()
	base := strings.TrimSuffix(fh.Filename, filepath.Ext(fh.Filename))
	if base == "" {
		base = "probe"
	}
	tmpPath := filepath.Join(tmpDir, base+"_probe_"+strconv.FormatInt((int64)(os.Getpid()), 10))
	out, err := os.Create(tmpPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create temp file"})
		return
	}
	if _, err := io.Copy(out, src); err != nil {
		out.Close()
		os.Remove(tmpPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write temp file"})
		return
	}
	out.Close()
	defer os.Remove(tmpPath)

	// ffprobe JSON limited to necessary fields
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-print_format", "json",
		"-show_entries", "stream=index,codec_type,codec_name,channels:stream_tags=language,title",
		tmpPath,
	)
	raw, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"audio": []any{}, "subtitles": []any{}})
		return
	}

	var parsed struct {
		Streams []struct {
			Index     int               `json:"index"`
			CodecType string            `json:"codec_type"`
			CodecName string            `json:"codec_name"`
			Channels  int               `json:"channels,omitempty"`
			Tags      map[string]string `json:"tags"`
		} `json:"streams"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		c.JSON(http.StatusOK, gin.H{"audio": []any{}, "subtitles": []any{}})
		return
	}

	audio := make([]map[string]any, 0)
	subs := make([]map[string]any, 0)
	aOrd := 0
	sOrd := 0
	for _, s := range parsed.Streams {
		lang := ""
		title := ""
		if s.Tags != nil {
			if v, ok := s.Tags["language"]; ok { lang = v }
			if v, ok := s.Tags["title"]; ok { title = v }
		}
		if s.CodecType == "audio" {
			audio = append(audio, map[string]any{
				"index":   aOrd, // ordinal for -map 0:a:index
				"codec":   s.CodecName,
				"channels": s.Channels,
				"lang":    lang,
				"title":   title,
			})
			aOrd++
		} else if s.CodecType == "subtitle" {
			subs = append(subs, map[string]any{
				"index": sOrd, // ordinal for -map 0:s:index
				"codec": s.CodecName,
				"lang":  lang,
				"title": title,
			})
			sOrd++
		}
	}

	c.JSON(http.StatusOK, gin.H{"audio": audio, "subtitles": subs})
}
