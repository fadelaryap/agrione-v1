package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type TestHandler struct {
	db *sql.DB
}

func NewTestHandler(db *sql.DB) *TestHandler {
	return &TestHandler{db: db}
}

type TestResponse struct {
	Status      string `json:"status"`
	Message     string `json:"message"`
	Database    string `json:"database,omitempty"`
	UserCount   int    `json:"user_count,omitempty"`
	Error       string `json:"error,omitempty"`
}

func (h *TestHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Test database connection
	err := h.db.Ping()
	if err != nil {
		json.NewEncoder(w).Encode(TestResponse{
			Status:  "error",
			Message: "Database connection failed",
			Error:   err.Error(),
		})
		return
	}

	// Get database name
	var dbName string
	err = h.db.QueryRow("SELECT current_database()").Scan(&dbName)
	if err != nil {
		json.NewEncoder(w).Encode(TestResponse{
			Status:  "error",
			Message: "Failed to get database name",
			Error:   err.Error(),
		})
		return
	}

	// Get user count
	var userCount int
	err = h.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		json.NewEncoder(w).Encode(TestResponse{
			Status:   "partial",
			Message:  "Database connected but failed to query users table",
			Database: dbName,
			Error:    err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(TestResponse{
		Status:    "success",
		Message:   "Database connection successful",
		Database:  dbName,
		UserCount: userCount,
	})
}


