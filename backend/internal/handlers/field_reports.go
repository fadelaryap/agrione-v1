package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type FieldReportsHandler struct {
	db *sql.DB
}

func NewFieldReportsHandler(db *sql.DB) *FieldReportsHandler {
	return &FieldReportsHandler{db: db}
}

type FieldReport struct {
	ID          int                    `json:"id"`
	Title       string                 `json:"title"`
	Description *string                `json:"description,omitempty"`
	Condition   string                 `json:"condition"`
	Coordinates map[string]interface{} `json:"coordinates"`
	Notes       *string                `json:"notes,omitempty"`
	SubmittedBy string                 `json:"submitted_by"`
	WorkOrderID *int                    `json:"work_order_id,omitempty"`
	Media       []interface{}           `json:"media"`
	CreatedAt   string                 `json:"created_at"`
	UpdatedAt   string                 `json:"updated_at"`
	Comments    []FieldReportComment   `json:"comments,omitempty"`
}

type FieldReportComment struct {
	ID            int    `json:"id"`
	FieldReportID int    `json:"field_report_id"`
	Comment       string `json:"comment"`
	CommentedBy   string `json:"commented_by"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type CreateFieldReportRequest struct {
	Title       string                 `json:"title"`
	Description *string                `json:"description,omitempty"`
	Condition   string                 `json:"condition"`
	Coordinates map[string]interface{} `json:"coordinates"`
	Notes       *string                `json:"notes,omitempty"`
	SubmittedBy string                 `json:"submitted_by"`
	WorkOrderID *int                    `json:"work_order_id,omitempty"`
	Media       []interface{}           `json:"media,omitempty"`
	Progress    *int                    `json:"progress,omitempty"` // Progress percentage for work order (0-100)
}

type UpdateFieldReportRequest struct {
	Title       *string                `json:"title,omitempty"`
	Description *string                `json:"description,omitempty"`
	Condition   *string                 `json:"condition,omitempty"`
	Coordinates map[string]interface{} `json:"coordinates,omitempty"`
	Notes       *string                `json:"notes,omitempty"`
	Media       []interface{}           `json:"media,omitempty"`
}

type CreateCommentRequest struct {
	Comment     string `json:"comment"`
	CommentedBy string `json:"commented_by"`
}

func (h *FieldReportsHandler) ListFieldReports(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	workOrderIDStr := query.Get("work_order_id")
	includeComments := query.Get("include_comments") == "true"

	var rows *sql.Rows
	var err error

	if workOrderIDStr != "" {
		workOrderID, err := strconv.Atoi(workOrderIDStr)
		if err != nil {
			http.Error(w, "Invalid work_order_id", http.StatusBadRequest)
			return
		}
		rows, err = h.db.Query(`
			SELECT id, title, description, condition, coordinates, notes, 
			       submitted_by, work_order_id, media, created_at, updated_at
			FROM field_reports
			WHERE work_order_id = $1
			ORDER BY created_at DESC
		`, workOrderID)
	} else {
		rows, err = h.db.Query(`
			SELECT id, title, description, condition, coordinates, notes, 
			       submitted_by, work_order_id, media, created_at, updated_at
			FROM field_reports
			ORDER BY created_at DESC
		`)
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reports []FieldReport
	for rows.Next() {
		var fr FieldReport
		var coordinatesJSON, mediaJSON []byte
		var description, notes, createdAt, updatedAt sql.NullString
		var workOrderID sql.NullInt64

		err := rows.Scan(
			&fr.ID, &fr.Title, &description, &fr.Condition, &coordinatesJSON,
			&notes, &fr.SubmittedBy, &workOrderID, &mediaJSON,
			&createdAt, &updatedAt,
		)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		if description.Valid {
			fr.Description = &description.String
		}
		if notes.Valid {
			fr.Notes = &notes.String
		}
		if workOrderID.Valid {
			id := int(workOrderID.Int64)
			fr.WorkOrderID = &id
		}
		if createdAt.Valid {
			fr.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			fr.UpdatedAt = updatedAt.String
		}

		if err := json.Unmarshal(coordinatesJSON, &fr.Coordinates); err != nil {
			http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
			return
		}

		if err := json.Unmarshal(mediaJSON, &fr.Media); err != nil {
			fr.Media = []interface{}{}
		}

		// Load comments if requested
		if includeComments {
			comments, err := h.getComments(fr.ID)
			if err == nil {
				fr.Comments = comments
			}
		}

		reports = append(reports, fr)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

func (h *FieldReportsHandler) GetFieldReport(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field report ID", http.StatusBadRequest)
		return
	}

	var fr FieldReport
	var coordinatesJSON, mediaJSON []byte
	var description, notes, createdAt, updatedAt sql.NullString
	var workOrderID sql.NullInt64

	err = h.db.QueryRow(`
		SELECT id, title, description, condition, coordinates, notes, 
		       submitted_by, work_order_id, media, created_at, updated_at
		FROM field_reports
		WHERE id = $1
	`, id).Scan(
		&fr.ID, &fr.Title, &description, &fr.Condition, &coordinatesJSON,
		&notes, &fr.SubmittedBy, &workOrderID, &mediaJSON,
		&createdAt, &updatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Field report not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		fr.Description = &description.String
	}
	if notes.Valid {
		fr.Notes = &notes.String
	}
	if workOrderID.Valid {
		id := int(workOrderID.Int64)
		fr.WorkOrderID = &id
	}
	if createdAt.Valid {
		fr.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		fr.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSON, &fr.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(mediaJSON, &fr.Media); err != nil {
		fr.Media = []interface{}{}
	}

	// Load comments
	comments, err := h.getComments(fr.ID)
	if err == nil {
		fr.Comments = comments
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fr)
}

func (h *FieldReportsHandler) CreateFieldReport(w http.ResponseWriter, r *http.Request) {
	var req CreateFieldReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Condition == "" || req.SubmittedBy == "" {
		http.Error(w, "Title, condition, and submitted_by are required", http.StatusBadRequest)
		return
	}

	coordinatesJSON, err := json.Marshal(req.Coordinates)
	if err != nil {
		http.Error(w, "Invalid coordinates format", http.StatusBadRequest)
		return
	}

	mediaJSON, err := json.Marshal(req.Media)
	if err != nil {
		http.Error(w, "Invalid media format", http.StatusBadRequest)
		return
	}

	var reportID int
	err = h.db.QueryRow(`
		INSERT INTO field_reports (title, description, condition, coordinates, notes, submitted_by, work_order_id, media)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, req.Title, req.Description, req.Condition, string(coordinatesJSON), req.Notes, req.SubmittedBy, req.WorkOrderID, string(mediaJSON)).Scan(&reportID)

	if err != nil {
		http.Error(w, "Failed to create field report", http.StatusInternalServerError)
		return
	}

	// Update work order progress if provided
	if req.Progress != nil && req.WorkOrderID != nil {
		progress := *req.Progress
		if progress < 0 {
			progress = 0
		}
		if progress > 100 {
			progress = 100
		}

		// Auto-update status based on progress
		var statusUpdate string
		if progress == 100 {
			statusUpdate = "status = 'completed', completed_date = CURRENT_TIMESTAMP"
		} else if progress > 0 {
			// Check current status - only update to in-progress if currently pending
			var currentStatus string
			err := h.db.QueryRow("SELECT status FROM work_orders WHERE id = $1", *req.WorkOrderID).Scan(&currentStatus)
			if err == nil && currentStatus == "pending" {
				statusUpdate = "status = 'in-progress'"
			}
		}

		updateQuery := "UPDATE work_orders SET progress = $1, updated_at = CURRENT_TIMESTAMP"
		if statusUpdate != "" {
			updateQuery += ", " + statusUpdate
		}
		updateQuery += " WHERE id = $2"

		_, err = h.db.Exec(updateQuery, progress, *req.WorkOrderID)
		if err != nil {
			// Log error but don't fail the report creation
			// In production, you might want to log this to a logging service
			_ = err
		}
	}

	// Fetch and return the created report
	var fr FieldReport
	var coordinatesJSONBytes, mediaJSONBytes []byte
	var description, notes, createdAt, updatedAt sql.NullString
	var workOrderID sql.NullInt64

	err = h.db.QueryRow(`
		SELECT id, title, description, condition, coordinates, notes, 
		       submitted_by, work_order_id, media, created_at, updated_at
		FROM field_reports
		WHERE id = $1
	`, reportID).Scan(
		&fr.ID, &fr.Title, &description, &fr.Condition, &coordinatesJSONBytes,
		&notes, &fr.SubmittedBy, &workOrderID, &mediaJSONBytes,
		&createdAt, &updatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to fetch created report", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		fr.Description = &description.String
	}
	if notes.Valid {
		fr.Notes = &notes.String
	}
	if workOrderID.Valid {
		id := int(workOrderID.Int64)
		fr.WorkOrderID = &id
	}
	if createdAt.Valid {
		fr.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		fr.UpdatedAt = updatedAt.String
	}

	if err := json.Unmarshal(coordinatesJSONBytes, &fr.Coordinates); err != nil {
		http.Error(w, "Failed to parse coordinates", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(mediaJSONBytes, &fr.Media); err != nil {
		fr.Media = []interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fr)
}

func (h *FieldReportsHandler) UpdateFieldReport(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field report ID", http.StatusBadRequest)
		return
	}

	var req UpdateFieldReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Title != nil {
		updates = append(updates, "title = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Title)
		argIndex++
	}
	if req.Description != nil {
		updates = append(updates, "description = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.Condition != nil {
		updates = append(updates, "condition = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Condition)
		argIndex++
	}
	if req.Coordinates != nil {
		coordinatesJSON, err := json.Marshal(req.Coordinates)
		if err != nil {
			http.Error(w, "Invalid coordinates format", http.StatusBadRequest)
			return
		}
		updates = append(updates, "coordinates = $"+strconv.Itoa(argIndex))
		args = append(args, string(coordinatesJSON))
		argIndex++
	}
	if req.Notes != nil {
		updates = append(updates, "notes = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Notes)
		argIndex++
	}
	if req.Media != nil {
		mediaJSON, err := json.Marshal(req.Media)
		if err != nil {
			http.Error(w, "Invalid media format", http.StatusBadRequest)
			return
		}
		updates = append(updates, "media = $"+strconv.Itoa(argIndex))
		args = append(args, string(mediaJSON))
		argIndex++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, id)

	query := "UPDATE field_reports SET " + updates[0]
	for i := 1; i < len(updates); i++ {
		query += ", " + updates[i]
	}
	query += " WHERE id = $" + strconv.Itoa(argIndex)

	_, err = h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update field report", http.StatusInternalServerError)
		return
	}

	// Fetch the updated report
	h.GetFieldReport(w, r)
}

func (h *FieldReportsHandler) DeleteFieldReport(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field report ID", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM field_reports WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete field report", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (h *FieldReportsHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	fieldReportID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field report ID", http.StatusBadRequest)
		return
	}

	var req CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Comment == "" || req.CommentedBy == "" {
		http.Error(w, "Comment and commented_by are required", http.StatusBadRequest)
		return
	}

	var commentID int
	err = h.db.QueryRow(`
		INSERT INTO field_report_comments (field_report_id, comment, commented_by)
		VALUES ($1, $2, $3)
		RETURNING id
	`, fieldReportID, req.Comment, req.CommentedBy).Scan(&commentID)

	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	// Fetch the created comment
	var comment FieldReportComment
	var createdAt, updatedAt sql.NullString
	err = h.db.QueryRow(`
		SELECT id, field_report_id, comment, commented_by, created_at, updated_at
		FROM field_report_comments
		WHERE id = $1
	`, commentID).Scan(
		&comment.ID, &comment.FieldReportID, &comment.Comment,
		&comment.CommentedBy, &createdAt, &updatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to fetch created comment", http.StatusInternalServerError)
		return
	}

	if createdAt.Valid {
		comment.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		comment.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
}

func (h *FieldReportsHandler) getComments(fieldReportID int) ([]FieldReportComment, error) {
	rows, err := h.db.Query(`
		SELECT id, field_report_id, comment, commented_by, created_at, updated_at
		FROM field_report_comments
		WHERE field_report_id = $1
		ORDER BY created_at ASC
	`, fieldReportID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []FieldReportComment
	for rows.Next() {
		var comment FieldReportComment
		var createdAt, updatedAt sql.NullString
		err := rows.Scan(
			&comment.ID, &comment.FieldReportID, &comment.Comment,
			&comment.CommentedBy, &createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}
		if createdAt.Valid {
			comment.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			comment.UpdatedAt = updatedAt.String
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

