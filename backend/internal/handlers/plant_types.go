package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type PlantTypesHandler struct {
	db *sql.DB
}

func NewPlantTypesHandler(db *sql.DB) *PlantTypesHandler {
	return &PlantTypesHandler{db: db}
}

type PlantType struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type CreatePlantTypeRequest struct {
	Name string `json:"name"`
}

func (h *PlantTypesHandler) ListPlantTypes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, name, created_at, updated_at 
		FROM plant_types 
		ORDER BY name ASC
	`)
	if err != nil {
		http.Error(w, "Failed to get plant types", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var plantTypes []PlantType
	for rows.Next() {
		var pt PlantType
		var createdAt, updatedAt sql.NullString

		err := rows.Scan(&pt.ID, &pt.Name, &createdAt, &updatedAt)
		if err != nil {
			http.Error(w, "Failed to scan plant type", http.StatusInternalServerError)
			return
		}

		if createdAt.Valid {
			pt.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			pt.UpdatedAt = updatedAt.String
		}

		plantTypes = append(plantTypes, pt)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plantTypes)
}

func (h *PlantTypesHandler) GetPlantType(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid plant type ID", http.StatusBadRequest)
		return
	}

	var pt PlantType
	var createdAt, updatedAt sql.NullString

	err = h.db.QueryRow(`
		SELECT id, name, created_at, updated_at 
		FROM plant_types 
		WHERE id = $1
	`, id).Scan(&pt.ID, &pt.Name, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Plant type not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if createdAt.Valid {
		pt.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		pt.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pt)
}

func (h *PlantTypesHandler) CreatePlantType(w http.ResponseWriter, r *http.Request) {
	var req CreatePlantTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	var pt PlantType
	var createdAt, updatedAt sql.NullString

	err := h.db.QueryRow(`
		INSERT INTO plant_types (name)
		VALUES ($1)
		RETURNING id, name, created_at, updated_at
	`, req.Name).Scan(&pt.ID, &pt.Name, &createdAt, &updatedAt)

	if err != nil {
		http.Error(w, "Failed to create plant type", http.StatusInternalServerError)
		return
	}

	if createdAt.Valid {
		pt.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		pt.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(pt)
}

func (h *PlantTypesHandler) UpdatePlantType(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid plant type ID", http.StatusBadRequest)
		return
	}

	var req CreatePlantTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	var pt PlantType
	var createdAt, updatedAt sql.NullString

	err = h.db.QueryRow(`
		UPDATE plant_types 
		SET name = $1, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $2
		RETURNING id, name, created_at, updated_at
	`, req.Name, id).Scan(&pt.ID, &pt.Name, &createdAt, &updatedAt)

	if err != nil {
		http.Error(w, "Failed to update plant type", http.StatusInternalServerError)
		return
	}

	if createdAt.Valid {
		pt.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		pt.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pt)
}

func (h *PlantTypesHandler) DeletePlantType(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid plant type ID", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM plant_types WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete plant type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

