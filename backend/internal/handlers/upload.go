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

type UploadRequest struct {
	File     string `json:"file"`     // base64 encoded file
	FileName string `json:"filename"` // original filename
	FileType string `json:"filetype"` // image/jpeg, video/mp4, etc.
}

type UploadResponse struct {
	URL      string `json:"url"`      // GCS URL or base64 data URL
	FileName string `json:"filename"` // stored filename
}

func (h *UploadHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	_, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.File == "" {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}

	// Decode base64
	var fileData []byte
	var err error
	
	// Handle data URL format (data:image/jpeg;base64,...)
	if strings.HasPrefix(req.File, "data:") {
		parts := strings.Split(req.File, ",")
		if len(parts) != 2 {
			http.Error(w, "Invalid data URL format", http.StatusBadRequest)
			return
		}
		fileData, err = base64.StdEncoding.DecodeString(parts[1])
	} else {
		fileData, err = base64.StdEncoding.DecodeString(req.File)
	}
	
	if err != nil {
		http.Error(w, "Failed to decode base64 file", http.StatusBadRequest)
		return
	}

	// Determine content type
	contentType := req.FileType
	if contentType == "" {
		if strings.HasPrefix(req.FileName, "photo") || strings.HasSuffix(req.FileName, ".jpg") || strings.HasSuffix(req.FileName, ".jpeg") {
			contentType = "image/jpeg"
		} else if strings.HasSuffix(req.FileName, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(req.FileName, ".mp4") || strings.HasSuffix(req.FileName, ".webm") {
			contentType = "video/mp4"
		} else {
			contentType = "application/octet-stream"
		}
	}

	var url string
	var fileName string

	if h.gcsClient != nil {
		// Upload to GCS
		fileName = fmt.Sprintf("%s_%d", req.FileName, time.Now().Unix())
		url, err = h.gcsClient.UploadFile(r.Context(), fileData, fileName, contentType)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to upload to GCS: %v", err), http.StatusInternalServerError)
			return
		}
	} else {
		// Fallback: return base64 data URL (for development or when GCS not configured)
		dataURL := fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(fileData))
		url = dataURL
		fileName = req.FileName
	}

	response := UploadResponse{
		URL:      url,
		FileName: fileName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UploadFileMultipart handles multipart/form-data uploads (alternative to JSON)
func (h *UploadHandler) UploadFileMultipart(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	_, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form (max 50MB)
	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file data
	fileData, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	var url string
	fileName := fmt.Sprintf("%s_%d", header.Filename, time.Now().Unix())

	if h.gcsClient != nil {
		// Upload to GCS
		url, err = h.gcsClient.UploadFile(r.Context(), fileData, fileName, contentType)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to upload to GCS: %v", err), http.StatusInternalServerError)
			return
		}
	} else {
		// Fallback: return base64 data URL
		dataURL := fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(fileData))
		url = dataURL
	}

	response := UploadResponse{
		URL:      url,
		FileName: fileName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

