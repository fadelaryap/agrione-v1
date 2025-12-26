package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type PlotsHandler struct {
	db *sql.DB
}

func NewPlotsHandler(db *sql.DB) *PlotsHandler {
	return &PlotsHandler{db: db}
}

type Plot struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Type        string  `json:"type"`
	APIKey      string  `json:"apikey"`
	Coordinates interface{} `json:"coordinates"`
	FieldRef    *int    `json:"field_ref,omitempty"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type CreatePlotRequest struct {
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Type        string      `json:"type"`
	APIKey      string      `json:"apikey"`
	Coordinates interface{} `json:"coordinates"`
	FieldRef    *int        `json:"field_ref,omitempty"`
}

type UpdatePlotRequest struct {
	Name        *string     `json:"name,omitempty"`
	Description *string     `json:"description,omitempty"`
	Type        *string     `json:"type,omitempty"`
	APIKey      *string     `json:"apikey,omitempty"`
	Coordinates interface{} `json:"coordinates,omitempty"`
	FieldRef    *int        `json:"field_ref,omitempty"`
}

func (h *PlotsHandler) ListPlots(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, name, description, type, apikey, coordinates, field_ref, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at 
		FROM plots 
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Failed to get plots", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var plots []Plot
	for rows.Next() {
		var p Plot
		var coordinatesJSON []byte
		var description, createdAt, updatedAt sql.NullString
		var fieldRef sql.NullInt64

		err := rows.Scan(
			&p.ID, &p.Name, &description, &p.Type, &p.APIKey, &coordinatesJSON,
			&fieldRef, &createdAt, &updatedAt,
		)
		if err != nil {
			http.Error(w, "Failed to scan plot", http.StatusInternalServerError)
			return
		}

		if description.Valid {
			p.Description = &description.String
		}
		if fieldRef.Valid {
			id := int(fieldRef.Int64)
			p.FieldRef = &id
		}
		if createdAt.Valid {
			p.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			p.UpdatedAt = updatedAt.String
		}

		if err := json.Unmarshal(coordinatesJSON, &p.Coordinates); err != nil {
			http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
			return
		}

		plots = append(plots, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plots)
}

func (h *PlotsHandler) GetPlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid plot ID", http.StatusBadRequest)
		return
	}

	var p Plot
	var coordinatesJSON []byte
	var description, createdAt, updatedAt sql.NullString
	var fieldRef sql.NullInt64

	err = h.db.QueryRow(`
		SELECT id, name, description, type, apikey, coordinates, field_ref, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at 
		FROM plots 
		WHERE id = $1
	`, id).Scan(
		&p.ID, &p.Name, &description, &p.Type, &p.APIKey, &coordinatesJSON,
		&fieldRef, &createdAt, &updatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Plot not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		p.Description = &description.String
	}
	if fieldRef.Valid {
		id := int(fieldRef.Int64)
		p.FieldRef = &id
	}
	if createdAt.Valid {
		p.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		p.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSON, &p.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *PlotsHandler) CreatePlot(w http.ResponseWriter, r *http.Request) {
	var req CreatePlotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Type == "" || req.APIKey == "" {
		http.Error(w, "Name, type, and apikey are required", http.StatusBadRequest)
		return
	}

	// Convert coordinates to JSON
	coordinatesJSON, err := json.Marshal(req.Coordinates)
	if err != nil {
		http.Error(w, "Invalid coordinates format", http.StatusBadRequest)
		return
	}

	var p Plot
	var coordinatesJSONOut []byte
	var description, createdAt, updatedAt sql.NullString
	var fieldRef sql.NullInt64

	err = h.db.QueryRow(`
		INSERT INTO plots (name, description, type, apikey, coordinates, field_ref)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, description, type, apikey, coordinates, field_ref, 
		          TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		          TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
	`, req.Name, req.Description, req.Type, req.APIKey, string(coordinatesJSON), req.FieldRef).Scan(
		&p.ID, &p.Name, &description, &p.Type, &p.APIKey, &coordinatesJSONOut,
		&fieldRef, &createdAt, &updatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create plot", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		p.Description = &description.String
	}
	if fieldRef.Valid {
		id := int(fieldRef.Int64)
		p.FieldRef = &id
	}
	if createdAt.Valid {
		p.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		p.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSONOut, &p.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func (h *PlotsHandler) UpdatePlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid plot ID", http.StatusBadRequest)
		return
	}

	var req UpdatePlotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		updates = append(updates, "name = $"+strconv.Itoa(argPos))
		args = append(args, *req.Name)
		argPos++
	}
	if req.Description != nil {
		updates = append(updates, "description = $"+strconv.Itoa(argPos))
		args = append(args, *req.Description)
		argPos++
	}
	if req.Type != nil {
		updates = append(updates, "type = $"+strconv.Itoa(argPos))
		args = append(args, *req.Type)
		argPos++
	}
	if req.APIKey != nil {
		updates = append(updates, "apikey = $"+strconv.Itoa(argPos))
		args = append(args, *req.APIKey)
		argPos++
	}
	if req.Coordinates != nil {
		coordinatesJSON, err := json.Marshal(req.Coordinates)
		if err != nil {
			http.Error(w, "Invalid coordinates format", http.StatusBadRequest)
			return
		}
		updates = append(updates, "coordinates = $"+strconv.Itoa(argPos))
		args = append(args, string(coordinatesJSON))
		argPos++
	}
	if req.FieldRef != nil {
		updates = append(updates, "field_ref = $"+strconv.Itoa(argPos))
		args = append(args, *req.FieldRef)
		argPos++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	updates = append(updates, "id = $"+strconv.Itoa(argPos))
	args = append(args, id)

	query := "UPDATE plots SET " + updates[0]
	for i := 1; i < len(updates)-1; i++ {
		query += ", " + updates[i]
	}
	query += " WHERE " + updates[len(updates)-1]

	_, err = h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update plot", http.StatusInternalServerError)
		return
	}

	// Return updated plot by querying directly
	var p Plot
	var coordinatesJSON []byte
	var description, createdAt, updatedAt sql.NullString
	var fieldRef sql.NullInt64

	err = h.db.QueryRow(`
		SELECT id, name, description, type, apikey, coordinates, field_ref, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at 
		FROM plots 
		WHERE id = $1
	`, id).Scan(
		&p.ID, &p.Name, &description, &p.Type, &p.APIKey, &coordinatesJSON,
		&fieldRef, &createdAt, &updatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve updated plot", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		p.Description = &description.String
	}
	if fieldRef.Valid {
		id := int(fieldRef.Int64)
		p.FieldRef = &id
	}
	if createdAt.Valid {
		p.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		p.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSON, &p.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *PlotsHandler) DeletePlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid plot ID", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM plots WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete plot", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

