package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type CultivationSeasonsHandler struct {
	db *sql.DB
}

func NewCultivationSeasonsHandler(db *sql.DB) *CultivationSeasonsHandler {
	return &CultivationSeasonsHandler{db: db}
}

type CultivationSeason struct {
	ID           int     `json:"id"`
	FieldID      int     `json:"field_id"`
	FieldName    *string `json:"field_name,omitempty"`
	Name         string  `json:"name"`
	PlantingDate string  `json:"planting_date"`
	Status       string  `json:"status"` // active, completed
	CompletedDate *string `json:"completed_date,omitempty"`
	Notes        *string `json:"notes,omitempty"`
	CreatedBy    string  `json:"created_by"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type CreateCultivationSeasonRequest struct {
	FieldID      int     `json:"field_id"`
	Name         string  `json:"name"`
	PlantingDate string  `json:"planting_date"`
	Notes        *string `json:"notes,omitempty"`
	CreatedBy    string  `json:"created_by"`
}

type UpdateCultivationSeasonRequest struct {
	Name         *string `json:"name,omitempty"`
	Status       *string `json:"status,omitempty"`
	CompletedDate *string `json:"completed_date,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

func (h *CultivationSeasonsHandler) ListCultivationSeasons(w http.ResponseWriter, r *http.Request) {
	fieldIDStr := r.URL.Query().Get("field_id")
	status := r.URL.Query().Get("status")

	var rows *sql.Rows
	var err error
	var args []interface{}
	
	query := `
		SELECT 
			cs.id, cs.field_id, cs.name, cs.planting_date, cs.status, cs.completed_date,
			cs.notes, cs.created_by,
			TO_CHAR(cs.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(cs.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			f.name as field_name
		FROM cultivation_seasons cs
		LEFT JOIN fields f ON cs.field_id = f.id
		WHERE 1=1
	`
	
	if fieldIDStr != "" {
		fieldID, _ := strconv.Atoi(fieldIDStr)
		args = append(args, fieldID)
		query += fmt.Sprintf(" AND cs.field_id = $%d", len(args))
	}
	
	if status != "" {
		args = append(args, status)
		query += fmt.Sprintf(" AND cs.status = $%d", len(args))
	}
	
	query += " ORDER BY cs.created_at DESC"
	
	rows, err = h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to get cultivation seasons", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var seasons []CultivationSeason
	for rows.Next() {
		var cs CultivationSeason
		var notes, completedDate, createdAt, updatedAt, fieldName sql.NullString

		err := rows.Scan(
			&cs.ID, &cs.FieldID, &cs.Name, &cs.PlantingDate, &cs.Status,
			&completedDate, &notes, &cs.CreatedBy,
			&createdAt, &updatedAt, &fieldName,
		)
		if err != nil {
			http.Error(w, "Failed to scan cultivation season", http.StatusInternalServerError)
			return
		}

		if notes.Valid {
			cs.Notes = &notes.String
		}
		if completedDate.Valid {
			cs.CompletedDate = &completedDate.String
		}
		if createdAt.Valid {
			cs.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			cs.UpdatedAt = updatedAt.String
		}
		if fieldName.Valid {
			cs.FieldName = &fieldName.String
		}

		seasons = append(seasons, cs)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(seasons)
}

func (h *CultivationSeasonsHandler) GetCultivationSeason(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid cultivation season ID", http.StatusBadRequest)
		return
	}

	var cs CultivationSeason
	var notes, completedDate, createdAt, updatedAt, fieldName sql.NullString

	err = h.db.QueryRow(`
		SELECT 
			cs.id, cs.field_id, cs.name, cs.planting_date, cs.status, cs.completed_date,
			cs.notes, cs.created_by,
			TO_CHAR(cs.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(cs.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			f.name as field_name
		FROM cultivation_seasons cs
		LEFT JOIN fields f ON cs.field_id = f.id
		WHERE cs.id = $1
	`, id).Scan(
		&cs.ID, &cs.FieldID, &cs.Name, &cs.PlantingDate, &cs.Status,
		&completedDate, &notes, &cs.CreatedBy,
		&createdAt, &updatedAt, &fieldName,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Cultivation season not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if notes.Valid {
		cs.Notes = &notes.String
	}
	if completedDate.Valid {
		cs.CompletedDate = &completedDate.String
	}
	if createdAt.Valid {
		cs.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		cs.UpdatedAt = updatedAt.String
	}
	if fieldName.Valid {
		cs.FieldName = &fieldName.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cs)
}

func (h *CultivationSeasonsHandler) CreateCultivationSeason(w http.ResponseWriter, r *http.Request) {
	var req CreateCultivationSeasonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.FieldID == 0 || req.Name == "" || req.PlantingDate == "" || req.CreatedBy == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Parse planting date
	plantingDate, err := time.Parse("2006-01-02", req.PlantingDate)
	if err != nil {
		http.Error(w, "Invalid planting_date format (expected YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Check if field has active cultivation season
	var existingID int
	err = h.db.QueryRow(`
		SELECT id FROM cultivation_seasons 
		WHERE field_id = $1 AND status = 'active'
	`, req.FieldID).Scan(&existingID)
	
	if err == nil {
		http.Error(w, "Field already has an active cultivation season", http.StatusBadRequest)
		return
	}
	if err != sql.ErrNoRows {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Insert cultivation season
	var csID int
	query := `
		INSERT INTO cultivation_seasons (
			field_id, name, planting_date, status, notes, created_by
		) VALUES ($1, $2, $3, 'active', $4, $5)
		RETURNING id
	`
	
	if req.Notes != nil {
		err = h.db.QueryRow(query, req.FieldID, req.Name, plantingDate, *req.Notes, req.CreatedBy).Scan(&csID)
	} else {
		err = h.db.QueryRow(query, req.FieldID, req.Name, plantingDate, nil, req.CreatedBy).Scan(&csID)
	}
	
	if err != nil {
		http.Error(w, "Failed to create cultivation season", http.StatusInternalServerError)
		return
	}

	// Get and return created cultivation season
	var cs CultivationSeason
	var notes, completedDate, createdAt, updatedAt, fieldName sql.NullString

	err = h.db.QueryRow(`
		SELECT 
			cs.id, cs.field_id, cs.name, cs.planting_date, cs.status, cs.completed_date,
			cs.notes, cs.created_by,
			TO_CHAR(cs.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(cs.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			f.name as field_name
		FROM cultivation_seasons cs
		LEFT JOIN fields f ON cs.field_id = f.id
		WHERE cs.id = $1
	`, csID).Scan(
		&cs.ID, &cs.FieldID, &cs.Name, &cs.PlantingDate, &cs.Status,
		&completedDate, &notes, &cs.CreatedBy,
		&createdAt, &updatedAt, &fieldName,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve created cultivation season", http.StatusInternalServerError)
		return
	}

	if notes.Valid {
		cs.Notes = &notes.String
	}
	if completedDate.Valid {
		cs.CompletedDate = &completedDate.String
	}
	if createdAt.Valid {
		cs.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		cs.UpdatedAt = updatedAt.String
	}
	if fieldName.Valid {
		cs.FieldName = &fieldName.String
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(cs)
}

func (h *CultivationSeasonsHandler) UpdateCultivationSeason(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid cultivation season ID", http.StatusBadRequest)
		return
	}

	var req UpdateCultivationSeasonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}

	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
		
		// If status is being set to completed, set completed_date
		if *req.Status == "completed" {
			updates = append(updates, fmt.Sprintf("completed_date = $%d", argIndex))
			args = append(args, time.Now())
			argIndex++
		}
	}

	if req.CompletedDate != nil {
		completedDate, err := time.Parse("2006-01-02T15:04:05", *req.CompletedDate)
		if err != nil {
			http.Error(w, "Invalid completed_date format", http.StatusBadRequest)
			return
		}
		updates = append(updates, fmt.Sprintf("completed_date = $%d", argIndex))
		args = append(args, completedDate)
		argIndex++
	}

	if req.Notes != nil {
		updates = append(updates, fmt.Sprintf("notes = $%d", argIndex))
		args = append(args, *req.Notes)
		argIndex++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Add updated_at
	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add id to args
	args = append(args, id)

	// Build SET clause
	setClause := ""
	for i, update := range updates {
		if i > 0 {
			setClause += ", "
		}
		setClause += update
	}
	
	query := fmt.Sprintf(`
		UPDATE cultivation_seasons 
		SET %s
		WHERE id = $%d
	`, setClause, argIndex)

	_, err = h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update cultivation season", http.StatusInternalServerError)
		return
	}

	// Get and return updated cultivation season
	var cs CultivationSeason
	var notes, completedDate, createdAt, updatedAt, fieldName sql.NullString

	err = h.db.QueryRow(`
		SELECT 
			cs.id, cs.field_id, cs.name, cs.planting_date, cs.status, cs.completed_date,
			cs.notes, cs.created_by,
			TO_CHAR(cs.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(cs.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			f.name as field_name
		FROM cultivation_seasons cs
		LEFT JOIN fields f ON cs.field_id = f.id
		WHERE cs.id = $1
	`, id).Scan(
		&cs.ID, &cs.FieldID, &cs.Name, &cs.PlantingDate, &cs.Status,
		&completedDate, &notes, &cs.CreatedBy,
		&createdAt, &updatedAt, &fieldName,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve updated cultivation season", http.StatusInternalServerError)
		return
	}

	if notes.Valid {
		cs.Notes = &notes.String
	}
	if completedDate.Valid {
		cs.CompletedDate = &completedDate.String
	}
	if createdAt.Valid {
		cs.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		cs.UpdatedAt = updatedAt.String
	}
	if fieldName.Valid {
		cs.FieldName = &fieldName.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cs)
}

func (h *CultivationSeasonsHandler) DeleteCultivationSeason(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid cultivation season ID", http.StatusBadRequest)
		return
	}

	// Check if cultivation season has work orders
	var count int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM work_orders WHERE cultivation_season_id = $1
	`, id).Scan(&count)
	
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	
	if count > 0 {
		http.Error(w, "Cannot delete cultivation season with associated work orders", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM cultivation_seasons WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete cultivation season", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

