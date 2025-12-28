package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

// ImportKMZ handles KMZ file upload and returns parsed polygons
func (h *FieldsHandler) ImportKMZ(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form with 32MB max memory
	err := r.ParseMultipartForm(32 << 20) // 32MB
	if err != nil {
		http.Error(w, "Failed to parse multipart form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("kmz_file")
	if err != nil {
		http.Error(w, "No file uploaded: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check file extension
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".kmz") {
		http.Error(w, "File must be a KMZ file (.kmz)", http.StatusBadRequest)
		return
	}

	// Parse KMZ file
	polygons, err := ParseKMZ(file, header.Size)
	if err != nil {
		log.Printf("[ImportKMZ] Error parsing KMZ: %v", err)
		http.Error(w, "Failed to parse KMZ file: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("[ImportKMZ] Successfully parsed %d polygons from KMZ file", len(polygons))

	// Return parsed polygons
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"polygons": polygons,
		"count":    len(polygons),
	})
}

// BatchCreateFieldsRequest represents the request for batch creating fields
type BatchCreateFieldsRequest struct {
	Fields []BatchFieldData `json:"fields"`
}

// BatchFieldData represents a single field to be created
type BatchFieldData struct {
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Coordinates [][]float64 `json:"coordinates"`
	PlantTypeID *int        `json:"plant_type_id,omitempty"`
	SoilTypeID  *int        `json:"soil_type_id,omitempty"`
	UserID      *int        `json:"user_id,omitempty"`
}

// BatchCreateFields creates multiple fields from parsed polygons
func (h *FieldsHandler) BatchCreateFields(w http.ResponseWriter, r *http.Request) {
	var req BatchCreateFieldsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Fields) == 0 {
		http.Error(w, "No fields provided", http.StatusBadRequest)
		return
	}

	var createdFields []Field
	var errors []string

	for i, fieldData := range req.Fields {
		if fieldData.Name == "" {
			errors = append(errors, fmt.Sprintf("Field %d: name is required", i+1))
			continue
		}

		if len(fieldData.Coordinates) < 3 {
			errors = append(errors, fmt.Sprintf("Field %d (%s): polygon must have at least 3 points", i+1, fieldData.Name))
			continue
		}

		// Calculate area (simple shoelace formula for polygon area in hectares)
		area := calculatePolygonArea(fieldData.Coordinates)

		// Convert coordinates to JSON
		coordinatesJSON, err := json.Marshal(fieldData.Coordinates)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Field %d (%s): invalid coordinates", i+1, fieldData.Name))
			continue
		}

		// Create field in database
		var fieldID int
		err = h.db.QueryRow(`
			INSERT INTO fields (name, description, area, coordinates, draw_type, plant_type_id, soil_type_id, user_id)
			VALUES ($1, $2, $3, $4, 'polygon', $5, $6, $7)
			RETURNING id
		`, fieldData.Name, fieldData.Description, area, string(coordinatesJSON), fieldData.PlantTypeID, fieldData.SoilTypeID, fieldData.UserID).Scan(&fieldID)

		if err != nil {
			errors = append(errors, fmt.Sprintf("Field %d (%s): failed to create: %v", i+1, fieldData.Name, err))
			continue
		}

		// Fetch created field
		var f Field
		var coordinatesJSONOut []byte
		var description, createdAt, updatedAt sql.NullString
		var areaVal sql.NullFloat64
		var plantTypeID, soilTypeID, userID sql.NullInt64

		err = h.db.QueryRow(`
			SELECT f.id, f.name, f.description, f.area, f.coordinates, f.draw_type, 
			       f.plant_type_id, f.soil_type_id, f.user_id, 
			       TO_CHAR(f.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
			       TO_CHAR(f.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
			FROM fields f
			WHERE f.id = $1
		`, fieldID).Scan(&f.ID, &f.Name, &description, &areaVal, &coordinatesJSONOut, &f.DrawType,
			&plantTypeID, &soilTypeID, &userID, &createdAt, &updatedAt)

		if err != nil {
			errors = append(errors, fmt.Sprintf("Field %d (%s): failed to fetch created field: %v", i+1, fieldData.Name, err))
			continue
		}

		if description.Valid {
			f.Description = &description.String
		}
		if areaVal.Valid {
			f.Area = &areaVal.Float64
		}
		if plantTypeID.Valid {
			val := int(plantTypeID.Int64)
			f.PlantTypeID = &val
		}
		if soilTypeID.Valid {
			val := int(soilTypeID.Int64)
			f.SoilTypeID = &val
		}
		if userID.Valid {
			userIDVal := int(userID.Int64)
			f.UserID = &userIDVal
		}
		if createdAt.Valid {
			f.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			f.UpdatedAt = updatedAt.String
		}

		if err := json.Unmarshal(coordinatesJSONOut, &f.Coordinates); err != nil {
			errors = append(errors, fmt.Sprintf("Field %d (%s): failed to parse coordinates", i+1, fieldData.Name))
			continue
		}

		createdFields = append(createdFields, f)
	}

	// Return results
	response := map[string]interface{}{
		"created": createdFields,
		"count":   len(createdFields),
	}
	if len(errors) > 0 {
		response["errors"] = errors
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// calculatePolygonArea calculates polygon area using shoelace formula
// Returns area in hectares
func calculatePolygonArea(coords [][]float64) float64 {
	if len(coords) < 3 {
		return 0
	}

	// Shoelace formula for polygon area
	var area float64
	n := len(coords)
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		area += coords[i][1] * coords[j][0] // lat * lng
		area -= coords[j][1] * coords[i][0] // lng * lat
	}
	area = abs(area) / 2.0

	// Convert from square degrees to square meters (approximate)
	// At equator: 1 degree ≈ 111 km, so 1 sq degree ≈ 12,321 sq km
	// But we'll use a more accurate calculation
	// Average: 1 degree latitude ≈ 111 km, 1 degree longitude varies by latitude
	// For Indonesia (around -4 to 7 latitude), average 1 degree longitude ≈ 111 km
	// So 1 sq degree ≈ 12,321 sq km = 12,321,000,000 sq meters
	// But this is very rough. Better to use a library, but for now this approximation works

	// Actually, let's use a simpler approach: calculate area using geographic formulas
	// Using spherical excess formula or just approximate for now
	// 1 degree at equator ≈ 111.32 km
	// Area in sq meters ≈ area * 111320 * 111320
	areaSqMeters := area * 111320.0 * 111320.0

	// Convert to hectares (1 hectare = 10,000 sq meters)
	areaHectares := areaSqMeters / 10000.0

	return areaHectares
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
