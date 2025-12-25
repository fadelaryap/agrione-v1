package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"agrione/backend/internal/config"
	"agrione/backend/internal/middleware"
	"agrione/backend/internal/storage"
)

type UploadHandler struct {
	gcsClient *storage.GCSClient
}

func NewUploadHandler(cfg *config.Config) (*UploadHandler, error) {
	if cfg.GCSBucketName == "" {
		// GCS not configured, return nil handler (will use base64 fallback)
		return &UploadHandler{gcsClient: nil}, nil
	}

	gcsClient, err := storage.NewGCSClient(cfg.GCSBucketName, cfg.GoogleCredentialsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize GCS client: %w", err)
	}

	return &UploadHandler{gcsClient: gcsClient}, nil
}

// GenerateSignedURLRequest is the request to generate a signed URL
type GenerateSignedURLRequest struct {
	FileName    string `json:"filename"`
	ContentType string `json:"content_type"`
}

// GenerateSignedURLResponse is the response with signed URL and object name
type GenerateSignedURLResponse struct {
	SignedURL string `json:"signed_url"`  // URL untuk upload langsung dari frontend
	ObjectName string `json:"object_name"` // Nama object di GCS (untuk disimpan di DB)
	PublicURL  string `json:"public_url"`  // Public URL setelah upload
}

// GenerateSignedURL generates a signed URL for direct upload from frontend to GCS
func (h *UploadHandler) GenerateSignedURL(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	_, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if h.gcsClient == nil {
		http.Error(w, "GCS not configured", http.StatusServiceUnavailable)
		return
	}

	var req GenerateSignedURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FileName == "" {
		http.Error(w, "Filename is required", http.StatusBadRequest)
		return
	}

	// Default content type
	contentType := req.ContentType
	if contentType == "" {
		fileName := req.FileName
		if len(fileName) >= 4 && fileName[len(fileName)-4:] == ".jpg" {
			contentType = "image/jpeg"
		} else if len(fileName) >= 5 && fileName[len(fileName)-5:] == ".jpeg" {
			contentType = "image/jpeg"
		} else if len(fileName) >= 4 && fileName[len(fileName)-4:] == ".png" {
			contentType = "image/png"
		} else if len(fileName) >= 4 && fileName[len(fileName)-4:] == ".mp4" {
			contentType = "video/mp4"
		} else if len(fileName) >= 5 && fileName[len(fileName)-5:] == ".webm" {
			contentType = "video/webm"
		} else {
			contentType = "application/octet-stream"
		}
	}

	// Generate signed URL (valid for 15 minutes)
	signedURL, objectName, err := h.gcsClient.GenerateSignedURL(r.Context(), req.FileName, contentType, 15*time.Minute)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate signed URL: %v", err), http.StatusInternalServerError)
		return
	}

	publicURL := h.gcsClient.GetPublicURL(objectName)

	response := GenerateSignedURLResponse{
		SignedURL:  signedURL,
		ObjectName: objectName,
		PublicURL:  publicURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

