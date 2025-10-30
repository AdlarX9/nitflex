package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Backend interface for storage operations
type Backend interface {
	ValidatePath(path string) error
	WriteFile(src, dst string) error
	DeleteFile(path string) error
	PathExists(path string) bool
	MoveFile(src, dst string) error
	EnsureDir(path string) error
}

// LocalStorage implements Backend for local filesystem
type LocalStorage struct {
	AllowedRoots []string // Allowed root directories
}

// NewLocalStorage creates a new local storage backend
func NewLocalStorage(roots []string) *LocalStorage {
	return &LocalStorage{
		AllowedRoots: roots,
	}
}

// ValidatePath checks if a path is within allowed roots and prevents directory traversal
func (ls *LocalStorage) ValidatePath(path string) error {
	cleanPath := filepath.Clean(path)

	// Check for directory traversal attempts
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("directory traversal not allowed: %s", path)
	}

	// Check if path is within allowed roots
	for _, root := range ls.AllowedRoots {
		cleanRoot := filepath.Clean(root)
		if strings.HasPrefix(cleanPath, cleanRoot) {
			return nil
		}
	}

	return fmt.Errorf("path %s is not within allowed roots", path)
}

// PathExists checks if a path exists
func (ls *LocalStorage) PathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// EnsureDir creates a directory if it doesn't exist
func (ls *LocalStorage) EnsureDir(path string) error {
	if err := ls.ValidatePath(path); err != nil {
		return err
	}

	if ls.PathExists(path) {
		return nil
	}

	return os.MkdirAll(path, 0755)
}

// WriteFile copies a file from src to dst
func (ls *LocalStorage) WriteFile(src, dst string) error {
	if err := ls.ValidatePath(dst); err != nil {
		return err
	}

	// Ensure destination directory exists
	dstDir := filepath.Dir(dst)
	if err := ls.EnsureDir(dstDir); err != nil {
		return err
	}

	// Read source file
	data, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("failed to read source file: %w", err)
	}

	// Write to destination
	if err := os.WriteFile(dst, data, 0644); err != nil {
		return fmt.Errorf("failed to write destination file: %w", err)
	}

	return nil
}

// MoveFile moves a file from src to dst atomically
func (ls *LocalStorage) MoveFile(src, dst string) error {
	if err := ls.ValidatePath(dst); err != nil {
		return err
	}

	// Ensure destination directory exists
	dstDir := filepath.Dir(dst)
	if err := ls.EnsureDir(dstDir); err != nil {
		return err
	}

	// Try atomic rename first (works if same filesystem)
	if err := os.Rename(src, dst); err == nil {
		return nil
	}

	// Fallback: copy then delete
	if err := ls.WriteFile(src, dst); err != nil {
		return err
	}

	return os.Remove(src)
}

// DeleteFile removes a file
func (ls *LocalStorage) DeleteFile(path string) error {
	if err := ls.ValidatePath(path); err != nil {
		return err
	}

	return os.Remove(path)
}

// ValidateStorageConfig checks that all storage paths are accessible and writable
func ValidateStorageConfig() error {
	dirs := map[string]string{
		"TEMP_DIR":        TEMP_DIR,
		"MOVIES_DIR":      MOVIES_DIR,
		"MOVIES_DOCU_DIR": MOVIES_DOCU_DIR,
		"SERIES_DIR":      SERIES_DIR,
		"SERIES_DOCU_DIR": SERIES_DOCU_DIR,
		"SERIES_KID_DIR":  SERIES_KID_DIR,
	}

	for name, dir := range dirs {
		if dir == "" {
			return fmt.Errorf("%s is not configured", name)
		}

		// Check if directory exists
		info, err := os.Stat(dir)
		if err != nil {
			if os.IsNotExist(err) {
				// Try to create it
				if err := os.MkdirAll(dir, 0755); err != nil {
					return fmt.Errorf("%s: directory does not exist and cannot be created: %s - %w", name, dir, err)
				}
			} else {
				return fmt.Errorf("%s: cannot access directory %s - %w", name, dir, err)
			}
		} else if !info.IsDir() {
			return fmt.Errorf("%s: %s is not a directory", name, dir)
		}

		// Check if writable by creating a test file
		testFile := filepath.Join(dir, ".nitflex_write_test")
		if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
			return fmt.Errorf("%s: directory %s is not writable - %w", name, dir, err)
		}
		os.Remove(testFile)
	}

	return nil
}
