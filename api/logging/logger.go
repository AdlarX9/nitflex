package logging

import (
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// LogLevel represents the severity of a log message
type LogLevel string

const (
	DEBUG LogLevel = "DEBUG"
	INFO  LogLevel = "INFO"
	WARN  LogLevel = "WARN"
	ERROR LogLevel = "ERROR"
)

// Logger provides structured logging
type Logger struct {
	prefix string
}

// NewLogger creates a new logger with optional prefix
func NewLogger(prefix string) *Logger {
	return &Logger{prefix: prefix}
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp time.Time              `json:"timestamp"`
	Level     LogLevel               `json:"level"`
	Message   string                 `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
	TraceID   string                 `json:"traceId,omitempty"`
}

// log writes a structured log entry
func (l *Logger) log(level LogLevel, message string, fields map[string]interface{}) {
	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     level,
		Message:   message,
		Fields:    fields,
	}

	// Simple JSON-like output
	output := fmt.Sprintf("[%s] %s: %s", entry.Timestamp.Format(time.RFC3339), entry.Level, entry.Message)
	
	if len(fields) > 0 {
		output += " {"
		first := true
		for k, v := range fields {
			if !first {
				output += ", "
			}
			output += fmt.Sprintf("%s: %v", k, v)
			first = false
		}
		output += "}"
	}

	if l.prefix != "" {
		output = fmt.Sprintf("[%s] %s", l.prefix, output)
	}

	log.Println(output)
}

// Debug logs a debug message
func (l *Logger) Debug(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(DEBUG, message, f)
}

// Info logs an info message
func (l *Logger) Info(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(INFO, message, f)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(WARN, message, f)
}

// Error logs an error message
func (l *Logger) Error(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(ERROR, message, f)
}

// WithFields returns a logger with preset fields
func (l *Logger) WithFields(fields map[string]interface{}) *FieldLogger {
	return &FieldLogger{
		logger: l,
		fields: fields,
	}
}

// FieldLogger is a logger with preset fields
type FieldLogger struct {
	logger *Logger
	fields map[string]interface{}
}

// Info logs with preset fields
func (fl *FieldLogger) Info(message string) {
	fl.logger.Info(message, fl.fields)
}

// Error logs with preset fields
func (fl *FieldLogger) Error(message string) {
	fl.logger.Error(message, fl.fields)
}

// Warn logs with preset fields
func (fl *FieldLogger) Warn(message string) {
	fl.logger.Warn(message, fl.fields)
}

// Debug logs with preset fields
func (fl *FieldLogger) Debug(message string) {
	fl.logger.Debug(message, fl.fields)
}

// Global logger instance
var globalLogger = NewLogger("")

// Info logs an info message using global logger
func Info(message string, fields ...map[string]interface{}) {
	globalLogger.Info(message, fields...)
}

// Error logs an error message using global logger
func Error(message string, fields ...map[string]interface{}) {
	globalLogger.Error(message, fields...)
}

// Warn logs a warning message using global logger
func Warn(message string, fields ...map[string]interface{}) {
	globalLogger.Warn(message, fields...)
}

// Debug logs a debug message using global logger
func Debug(message string, fields ...map[string]interface{}) {
	globalLogger.Debug(message, fields...)
}

// TraceID generates a new trace ID
func TraceID() string {
	return primitive.NewObjectID().Hex()
}

// LogJobEvent logs a job-related event
func LogJobEvent(jobID, stage, message string, fields map[string]interface{}) {
	if fields == nil {
		fields = make(map[string]interface{})
	}
	fields["jobID"] = jobID
	fields["stage"] = stage
	Info(message, fields)
}

// LogTranscodeEvent logs a transcoding event
func LogTranscodeEvent(jobID string, progress float64, message string) {
	Info(message, map[string]interface{}{
		"jobID":    jobID,
		"progress": progress,
		"event":    "transcode",
	})
}

// LogError logs an error with context
func LogError(err error, message string, fields map[string]interface{}) {
	if fields == nil {
		fields = make(map[string]interface{})
	}
	fields["error"] = err.Error()
	Error(message, fields)
}

// SetOutput sets the output destination for logs
func SetOutput(w *os.File) {
	log.SetOutput(w)
}

// InitLogger initializes the logging system
func InitLogger(logFile string) error {
	if logFile != "" {
		f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return fmt.Errorf("failed to open log file: %w", err)
		}
		log.SetOutput(f)
	}
	
	log.SetFlags(0) // We handle formatting ourselves
	return nil
}
