package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type FieldsHandler struct {
	db *sql.DB
}

func NewFieldsHandler(db *sql.DB) *FieldsHandler {
	return &FieldsHandler{db: db}
}

type Field struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Area        *float64 `json:"area,omitempty"`
	Coordinates interface{} `json:"coordinates"`
	DrawType    string  `json:"draw_type"`
	PlantTypeID *int    `json:"plant_type_id,omitempty"`
	SoilTypeID  *int    `json:"soil_type_id,omitempty"`
	UserID      *int    `json:"user_id,omitempty"`
	UserName    *string `json:"user_name,omitempty"` // First name + Last name
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type CreateFieldRequest struct {
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Area        *float64    `json:"area,omitempty"`
	Coordinates interface{} `json:"coordinates"`
	DrawType    string      `json:"draw_type"`
	PlantTypeID *int        `json:"plant_type_id,omitempty"`
	SoilTypeID  *int        `json:"soil_type_id,omitempty"`
	UserID      *int        `json:"user_id,omitempty"`
}

type UpdateFieldRequest struct {
	Name        *string     `json:"name,omitempty"`
	Description *string     `json:"description,omitempty"`
	Area        *float64    `json:"area,omitempty"`
	Coordinates interface{} `json:"coordinates,omitempty"`
	DrawType    *string     `json:"draw_type,omitempty"`
	PlantTypeID *int        `json:"plant_type_id,omitempty"`
	SoilTypeID  *int        `json:"soil_type_id,omitempty"`
	UserID      *int        `json:"user_id,omitempty"`
}

func (h *FieldsHandler) ListFields(w http.ResponseWriter, r *http.Request) {
	// Get user_id from query if provided (for filtering by user)
	userIDStr := r.URL.Query().Get("user_id")
	
	var rows *sql.Rows
	var err error
	
	if userIDStr != "" {
		userID, _ := strconv.Atoi(userIDStr)
		rows, err = h.db.Query(`
			SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
			       f.plant_type_id, f.soil_type_id, f.user_id, 
			       f.created_at, f.updated_at,
			       CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name
			FROM fields f
			LEFT JOIN users u ON f.user_id = u.id
			WHERE f.user_id = $1 
			ORDER BY f.created_at DESC
		`, userID)
	} else {
		rows, err = h.db.Query(`
			SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
			       f.plant_type_id, f.soil_type_id, f.user_id, 
			       f.created_at, f.updated_at,
			       CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name
			FROM fields f
			LEFT JOIN users u ON f.user_id = u.id
			ORDER BY f.created_at DESC
		`)
	}
	
	if err != nil {
		http.Error(w, "Failed to get fields", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var fields []Field
	for rows.Next() {
		var f Field
		var coordinatesJSON []byte
		var description, createdAt, updatedAt, userName sql.NullString
		var area sql.NullFloat64
		var plantTypeID, soilTypeID, userID sql.NullInt64

		err := rows.Scan(
			&f.ID, &f.Name, &description, &area, &coordinatesJSON,
			&f.DrawType, &plantTypeID, &soilTypeID, &userID,
			&createdAt, &updatedAt, &userName,
		)
		if err != nil {
			http.Error(w, "Failed to scan field", http.StatusInternalServerError)
			return
		}

		if description.Valid {
			f.Description = &description.String
		}
		if area.Valid {
			f.Area = &area.Float64
		}
		if plantTypeID.Valid {
			id := int(plantTypeID.Int64)
			f.PlantTypeID = &id
		}
		if soilTypeID.Valid {
			id := int(soilTypeID.Int64)
			f.SoilTypeID = &id
		}
		if userID.Valid {
			id := int(userID.Int64)
			f.UserID = &id
		}
		if userName.Valid {
			f.UserName = &userName.String
		}
		if createdAt.Valid {
			f.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			f.UpdatedAt = updatedAt.String
		}

		// Parse coordinates JSON
		if err := json.Unmarshal(coordinatesJSON, &f.Coordinates); err != nil {
			http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
			return
		}

		fields = append(fields, f)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fields)
}

func (h *FieldsHandler) GetField(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field ID", http.StatusBadRequest)
		return
	}

	var f Field
	var coordinatesJSON []byte
	var description, createdAt, updatedAt, userName sql.NullString
	var area sql.NullFloat64
	var plantTypeID, soilTypeID, userID sql.NullInt64

	err = h.db.QueryRow(`
		SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
		       f.plant_type_id, f.soil_type_id, f.user_id, 
		       f.created_at, f.updated_at,
		       CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name
		FROM fields f
		LEFT JOIN users u ON f.user_id = u.id
		WHERE f.id = $1
	`, id).Scan(
		&f.ID, &f.Name, &description, &area, &coordinatesJSON,
		&f.DrawType, &plantTypeID, &soilTypeID, &userID,
		&createdAt, &updatedAt, &userName,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Field not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		f.Description = &description.String
	}
	if area.Valid {
		f.Area = &area.Float64
	}
	if plantTypeID.Valid {
		id := int(plantTypeID.Int64)
		f.PlantTypeID = &id
	}
	if soilTypeID.Valid {
		id := int(soilTypeID.Int64)
		f.SoilTypeID = &id
	}
	if userID.Valid {
		id := int(userID.Int64)
		f.UserID = &id
	}
	if userName.Valid {
		f.UserName = &userName.String
	}
	if createdAt.Valid {
		f.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		f.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSON, &f.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(f)
}

func (h *FieldsHandler) CreateField(w http.ResponseWriter, r *http.Request) {
	var req CreateFieldRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.DrawType == "" {
		http.Error(w, "Name and draw_type are required", http.StatusBadRequest)
		return
	}

	// Convert coordinates to JSON
	coordinatesJSON, err := json.Marshal(req.Coordinates)
	if err != nil {
		http.Error(w, "Invalid coordinates format", http.StatusBadRequest)
		return
	}

	var f Field
	var coordinatesJSONOut []byte
	var description, createdAt, updatedAt sql.NullString
	var area sql.NullFloat64
	var plantTypeID, soilTypeID, userID sql.NullInt64

	var fieldID int
	err = h.db.QueryRow(`
		INSERT INTO fields (name, description, area, coordinates, draw_type, plant_type_id, soil_type_id, user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, req.Name, req.Description, req.Area, string(coordinatesJSON), req.DrawType, req.PlantTypeID, req.SoilTypeID, req.UserID).Scan(&fieldID)

	if err != nil {
		http.Error(w, "Failed to create field", http.StatusInternalServerError)
		return
	}

	// Fetch the created field with user name
	var userName sql.NullString
	err = h.db.QueryRow(`
		SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
		       f.plant_type_id, f.soil_type_id, f.user_id, 
		       f.created_at, f.updated_at,
		       CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name
		FROM fields f
		LEFT JOIN users u ON f.user_id = u.id
		WHERE f.id = $1
	`, fieldID).Scan(
		&f.ID, &f.Name, &description, &area, &coordinatesJSONOut,
		&f.DrawType, &plantTypeID, &soilTypeID, &userID,
		&createdAt, &updatedAt, &userName,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve created field", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		f.Description = &description.String
	}
	if area.Valid {
		f.Area = &area.Float64
	}
	if plantTypeID.Valid {
		id := int(plantTypeID.Int64)
		f.PlantTypeID = &id
	}
	if soilTypeID.Valid {
		id := int(soilTypeID.Int64)
		f.SoilTypeID = &id
	}
	if userID.Valid {
		id := int(userID.Int64)
		f.UserID = &id
	}
	if userName.Valid {
		f.UserName = &userName.String
	}
	if createdAt.Valid {
		f.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		f.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSONOut, &f.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(f)
}

func (h *FieldsHandler) UpdateField(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field ID", http.StatusBadRequest)
		return
	}

	var req UpdateFieldRequest
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
	if req.Area != nil {
		updates = append(updates, "area = $"+strconv.Itoa(argPos))
		args = append(args, *req.Area)
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
	if req.DrawType != nil {
		updates = append(updates, "draw_type = $"+strconv.Itoa(argPos))
		args = append(args, *req.DrawType)
		argPos++
	}
	if req.PlantTypeID != nil {
		updates = append(updates, "plant_type_id = $"+strconv.Itoa(argPos))
		args = append(args, *req.PlantTypeID)
		argPos++
	}
	if req.SoilTypeID != nil {
		updates = append(updates, "soil_type_id = $"+strconv.Itoa(argPos))
		args = append(args, *req.SoilTypeID)
		argPos++
	}
	if req.UserID != nil {
		updates = append(updates, "user_id = $"+strconv.Itoa(argPos))
		args = append(args, *req.UserID)
		argPos++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	updates = append(updates, "id = $"+strconv.Itoa(argPos))
	args = append(args, id)

	query := "UPDATE fields SET " + updates[0]
	for i := 1; i < len(updates)-1; i++ {
		query += ", " + updates[i]
	}
	query += " WHERE " + updates[len(updates)-1]

	_, err = h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update field", http.StatusInternalServerError)
		return
	}

	// Return updated field by querying directly
	var f Field
	var coordinatesJSON []byte
	var description, createdAt, updatedAt, userName sql.NullString
	var area sql.NullFloat64
	var plantTypeID, soilTypeID, userID sql.NullInt64

	err = h.db.QueryRow(`
		SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
		       f.plant_type_id, f.soil_type_id, f.user_id, 
		       f.created_at, f.updated_at,
		       CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name
		FROM fields f
		LEFT JOIN users u ON f.user_id = u.id
		WHERE f.id = $1
	`, id).Scan(
		&f.ID, &f.Name, &description, &area, &coordinatesJSON,
		&f.DrawType, &plantTypeID, &soilTypeID, &userID,
		&createdAt, &updatedAt, &userName,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve updated field", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		f.Description = &description.String
	}
	if area.Valid {
		f.Area = &area.Float64
	}
	if plantTypeID.Valid {
		id := int(plantTypeID.Int64)
		f.PlantTypeID = &id
	}
	if soilTypeID.Valid {
		id := int(soilTypeID.Int64)
		f.SoilTypeID = &id
	}
	if userID.Valid {
		id := int(userID.Int64)
		f.UserID = &id
	}
	if userName.Valid {
		f.UserName = &userName.String
	}
	if createdAt.Valid {
		f.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		f.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSON, &f.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(f)
}

func (h *FieldsHandler) DeleteField(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field ID", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM fields WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete field", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func (h *FieldsHandler) AssignFieldToUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	fieldIDStr := vars["id"]
	fieldID, err := strconv.Atoi(fieldIDStr)
	if err != nil {
		http.Error(w, "Invalid field ID", http.StatusBadRequest)
		return
	}

	var req struct {
		UserID *int `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify user exists and has Level 3 or 4 role
	if req.UserID != nil {
		var role string
		err = h.db.QueryRow("SELECT role FROM users WHERE id = $1", *req.UserID).Scan(&role)
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		if role != "Level 3" && role != "Level 4" {
			http.Error(w, "User must have Level 3 or Level 4 role", http.StatusBadRequest)
			return
		}
	}

	_, err = h.db.Exec("UPDATE fields SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", req.UserID, fieldID)
	if err != nil {
		http.Error(w, "Failed to assign field to user", http.StatusInternalServerError)
		return
	}

	// Return updated field by querying directly
	var f Field
	var coordinatesJSON []byte
	var description, createdAt, updatedAt, userName sql.NullString
	var area sql.NullFloat64
	var plantTypeID, soilTypeID, userID sql.NullInt64

	err = h.db.QueryRow(`
		SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
		       f.plant_type_id, f.soil_type_id, f.user_id, 
		       f.created_at, f.updated_at,
		       CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name
		FROM fields f
		LEFT JOIN users u ON f.user_id = u.id
		WHERE f.id = $1
	`, fieldID).Scan(
		&f.ID, &f.Name, &description, &area, &coordinatesJSON,
		&f.DrawType, &plantTypeID, &soilTypeID, &userID,
		&createdAt, &updatedAt, &userName,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve updated field", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		f.Description = &description.String
	}
	if area.Valid {
		f.Area = &area.Float64
	}
	if plantTypeID.Valid {
		id := int(plantTypeID.Int64)
		f.PlantTypeID = &id
	}
	if soilTypeID.Valid {
		id := int(soilTypeID.Int64)
		f.SoilTypeID = &id
	}
	if userID.Valid {
		id := int(userID.Int64)
		f.UserID = &id
	}
	if userName.Valid {
		f.UserName = &userName.String
	}
	if createdAt.Valid {
		f.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		f.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSON, &f.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(f)
}

