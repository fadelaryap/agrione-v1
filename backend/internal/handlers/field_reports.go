package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"agrione/backend/internal/websocket"

	"github.com/gorilla/mux"
)

type FieldReportsHandler struct {
	db  *sql.DB
	hub *websocket.Hub
}

func NewFieldReportsHandler(db *sql.DB, hub *websocket.Hub) *FieldReportsHandler {
	return &FieldReportsHandler{db: db, hub: hub}
}

type FieldReport struct {
	ID             int                    `json:"id"`
	Title          string                 `json:"title"`
	Description    *string                `json:"description,omitempty"`
	Condition      string                 `json:"condition"`
	Coordinates    map[string]interface{} `json:"coordinates"`
	Notes          *string                `json:"notes,omitempty"`
	SubmittedBy    string                 `json:"submitted_by"`
	WorkOrderID    *int                    `json:"work_order_id,omitempty"`
	Media          []interface{}           `json:"media"`
	Status         string                 `json:"status"` // pending, approved, rejected
	ApprovedBy     *string                `json:"approved_by,omitempty"`
	ApprovedAt     *string                `json:"approved_at,omitempty"`
	RejectionReason *string               `json:"rejection_reason,omitempty"`
	HarvestQuantity *float64              `json:"harvest_quantity,omitempty"` // For Panen activity (in ton/kg)
	HarvestQuality  *string               `json:"harvest_quality,omitempty"`   // For Panen activity
	CreatedAt      string                 `json:"created_at"`
	UpdatedAt      string                 `json:"updated_at"`
	Comments       []FieldReportComment   `json:"comments,omitempty"`
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
	Title          string                 `json:"title"`
	Description    *string                `json:"description,omitempty"`
	Condition      string                 `json:"condition"`
	Coordinates    map[string]interface{} `json:"coordinates"`
	Notes          *string                `json:"notes,omitempty"`
	SubmittedBy    string                 `json:"submitted_by"`
	WorkOrderID    *int                    `json:"work_order_id,omitempty"`
	Media          []interface{}           `json:"media,omitempty"`
	Progress       *int                    `json:"progress,omitempty"` // Progress percentage for work order (0-100)
	HarvestQuantity *float64               `json:"harvest_quantity,omitempty"` // For Panen activity (in ton/kg)
	HarvestQuality  *string                `json:"harvest_quality,omitempty"`   // For Panen activity
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

type ApproveFieldReportRequest struct {
	ApprovedBy string `json:"approved_by"`
}

type RejectFieldReportRequest struct {
	RejectedBy      string `json:"rejected_by"`
	RejectionReason string `json:"rejection_reason"`
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
			       submitted_by, work_order_id, media, status, approved_by, 
			       TO_CHAR(approved_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as approved_at, 
			       rejection_reason, harvest_quantity, harvest_quality,
			       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
			       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
			FROM field_reports
			WHERE work_order_id = $1
			ORDER BY created_at DESC
		`, workOrderID)
	} else {
		rows, err = h.db.Query(`
			SELECT id, title, description, condition, coordinates, notes, 
			       submitted_by, work_order_id, media, status, approved_by, 
			       TO_CHAR(approved_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as approved_at, 
			       rejection_reason, harvest_quantity, harvest_quality,
			       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
			       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
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
		var description, notes, createdAt, updatedAt, status, approvedBy, approvedAt, rejectionReason, harvestQuality sql.NullString
		var workOrderID sql.NullInt64
		var harvestQuantity sql.NullFloat64

		err := rows.Scan(
			&fr.ID, &fr.Title, &description, &fr.Condition, &coordinatesJSON,
			&notes, &fr.SubmittedBy, &workOrderID, &mediaJSON,
			&status, &approvedBy, &approvedAt, &rejectionReason,
			&harvestQuantity, &harvestQuality,
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
		if status.Valid {
			fr.Status = status.String
		} else {
			fr.Status = "pending"
		}
		if approvedBy.Valid {
			fr.ApprovedBy = &approvedBy.String
		}
		if approvedAt.Valid {
			fr.ApprovedAt = &approvedAt.String
		}
		if rejectionReason.Valid {
			fr.RejectionReason = &rejectionReason.String
		}
		if harvestQuantity.Valid {
			fr.HarvestQuantity = &harvestQuantity.Float64
		}
		if harvestQuality.Valid {
			fr.HarvestQuality = &harvestQuality.String
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
	var description, notes, createdAt, updatedAt, status, approvedBy, approvedAt, rejectionReason, harvestQuality sql.NullString
	var workOrderID sql.NullInt64
	var harvestQuantity sql.NullFloat64

	err = h.db.QueryRow(`
		SELECT id, title, description, condition, coordinates, notes, 
		       submitted_by, work_order_id, media, status, approved_by, 
		       TO_CHAR(approved_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as approved_at, 
		       rejection_reason, harvest_quantity, harvest_quality,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM field_reports
		WHERE id = $1
	`, id).Scan(
		&fr.ID, &fr.Title, &description, &fr.Condition, &coordinatesJSON,
		&notes, &fr.SubmittedBy, &workOrderID, &mediaJSON,
		&status, &approvedBy, &approvedAt, &rejectionReason,
		&harvestQuantity, &harvestQuality,
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
	if status.Valid {
		fr.Status = status.String
	} else {
		fr.Status = "pending"
	}
	if approvedBy.Valid {
		fr.ApprovedBy = &approvedBy.String
	}
	if approvedAt.Valid {
		fr.ApprovedAt = &approvedAt.String
	}
	if rejectionReason.Valid {
		fr.RejectionReason = &rejectionReason.String
	}
	if harvestQuantity.Valid {
		fr.HarvestQuantity = &harvestQuantity.Float64
	}
	if harvestQuality.Valid {
		fr.HarvestQuality = &harvestQuality.String
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
		INSERT INTO field_reports (title, description, condition, coordinates, notes, submitted_by, work_order_id, media, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
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

	// Create notifications for Level 1/2 users
	go func() {
		level12UserIDs, err := websocket.GetUserIDsByRole(h.db, "Level 1")
		if err == nil {
			level12UserIDs2, err2 := websocket.GetUserIDsByRole(h.db, "Level 2")
			if err2 == nil {
				level12UserIDs = append(level12UserIDs, level12UserIDs2...)
			}
		}
		if err == nil {
			for _, userID := range level12UserIDs {
				websocket.CreateNotification(
					h.db,
					h.hub,
					userID,
					"field_report_pending",
					"Laporan Baru Menunggu Persetujuan",
					fmt.Sprintf("Laporan '%s' dari %s menunggu persetujuan", req.Title, req.SubmittedBy),
					fmt.Sprintf("/dashboard/field-reports-approval?filter=pending&report_id=%d", reportID),
				)
			}
		}
	}()

	// Fetch and return the created report
	var fr FieldReport
	var coordinatesJSONBytes, mediaJSONBytes []byte
	var description, notes, createdAt, updatedAt, status, approvedBy, approvedAt, rejectionReason, harvestQuality sql.NullString
	var workOrderID sql.NullInt64
	var harvestQuantity sql.NullFloat64

	err = h.db.QueryRow(`
		SELECT id, title, description, condition, coordinates, notes, 
		       submitted_by, work_order_id, media, status, approved_by, 
		       TO_CHAR(approved_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as approved_at, 
		       rejection_reason, harvest_quantity, harvest_quality,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM field_reports
		WHERE id = $1
	`, reportID).Scan(
		&fr.ID, &fr.Title, &description, &fr.Condition, &coordinatesJSONBytes,
		&notes, &fr.SubmittedBy, &workOrderID, &mediaJSONBytes,
		&status, &approvedBy, &approvedAt, &rejectionReason,
		&harvestQuantity, &harvestQuality,
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
	if status.Valid {
		fr.Status = status.String
	} else {
		fr.Status = "pending"
	}
	if approvedBy.Valid {
		fr.ApprovedBy = &approvedBy.String
	}
	if approvedAt.Valid {
		fr.ApprovedAt = &approvedAt.String
	}
	if rejectionReason.Valid {
		fr.RejectionReason = &rejectionReason.String
	}
	if harvestQuantity.Valid {
		fr.HarvestQuantity = &harvestQuantity.Float64
	}
	if harvestQuality.Valid {
		fr.HarvestQuality = &harvestQuality.String
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

	// Get submitted_by and status before inserting comment
	var submittedBy string
	var status string
	err = h.db.QueryRow("SELECT submitted_by, status FROM field_reports WHERE id = $1", fieldReportID).Scan(&submittedBy, &status)
	if err != nil {
		http.Error(w, "Failed to get field report", http.StatusInternalServerError)
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

	// Create notification for the submitter (if comment is from someone else)
	if req.CommentedBy != submittedBy {
		go func() {
			submitterUserID, err := websocket.GetUserIDFromSubmittedBy(h.db, submittedBy)
			if err == nil && submitterUserID > 0 {
				var reportTitle string
				h.db.QueryRow("SELECT title FROM field_reports WHERE id = $1", fieldReportID).Scan(&reportTitle)
				websocket.CreateNotification(
					h.db,
					h.hub,
					submitterUserID,
					"field_report_comment",
					"Komentar Baru di Laporan Anda",
					fmt.Sprintf("%s memberikan komentar pada laporan '%s'", req.CommentedBy, reportTitle),
					fmt.Sprintf("/lapangan/work-orders/%d/report", fieldReportID),
				)
			}
		}()
	}

	// Also notify Level 1/2 if report is pending
	if status == "pending" {
		go func() {
			level12UserIDs, err := websocket.GetUserIDsByRole(h.db, "Level 1")
			if err == nil {
				level12UserIDs2, err2 := websocket.GetUserIDsByRole(h.db, "Level 2")
				if err2 == nil {
					level12UserIDs = append(level12UserIDs, level12UserIDs2...)
				}
			}
			if err == nil {
				for _, userID := range level12UserIDs {
					var reportTitle string
					h.db.QueryRow("SELECT title FROM field_reports WHERE id = $1", fieldReportID).Scan(&reportTitle)
					websocket.CreateNotification(
						h.db,
						h.hub,
						userID,
						"field_report_comment",
						"Komentar Baru di Laporan",
						fmt.Sprintf("%s memberikan komentar pada laporan '%s'", req.CommentedBy, reportTitle),
						fmt.Sprintf("/dashboard/field-reports-approval?filter=pending&report_id=%d", fieldReportID),
					)
				}
			}
		}()
	}

	// Fetch the created comment
	var comment FieldReportComment
	var createdAt, updatedAt sql.NullString
	err = h.db.QueryRow(`
		SELECT id, field_report_id, comment, commented_by, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
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

func (h *FieldReportsHandler) ApproveFieldReport(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field report ID", http.StatusBadRequest)
		return
	}

	var req ApproveFieldReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ApprovedBy == "" {
		http.Error(w, "approved_by is required", http.StatusBadRequest)
		return
	}

	// Get submitted_by before updating
	var submittedBy string
	err = h.db.QueryRow("SELECT submitted_by FROM field_reports WHERE id = $1", id).Scan(&submittedBy)
	if err != nil {
		http.Error(w, "Failed to get field report", http.StatusInternalServerError)
		return
	}

	// Update field report status to approved
	_, err = h.db.Exec(`
		UPDATE field_reports 
		SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, req.ApprovedBy, id)
	if err != nil {
		http.Error(w, "Failed to approve field report", http.StatusInternalServerError)
		return
	}

	// Create notification for the submitter
	go func() {
		submitterUserID, err := websocket.GetUserIDFromSubmittedBy(h.db, submittedBy)
		if err == nil && submitterUserID > 0 {
			var reportTitle string
			h.db.QueryRow("SELECT title FROM field_reports WHERE id = $1", id).Scan(&reportTitle)
			websocket.CreateNotification(
				h.db,
				h.hub,
				submitterUserID,
				"field_report_approved",
				"Laporan Anda Disetujui",
				fmt.Sprintf("Laporan '%s' telah disetujui oleh %s", reportTitle, req.ApprovedBy),
				fmt.Sprintf("/lapangan/work-orders/%d/report", id),
			)
		}
	}()

	// Fetch and return the updated report
	h.GetFieldReport(w, r)
}

func (h *FieldReportsHandler) RejectFieldReport(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid field report ID", http.StatusBadRequest)
		return
	}

	var req RejectFieldReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RejectedBy == "" {
		http.Error(w, "rejected_by is required", http.StatusBadRequest)
		return
	}

	// Get submitted_by before updating
	var submittedBy string
	err = h.db.QueryRow("SELECT submitted_by FROM field_reports WHERE id = $1", id).Scan(&submittedBy)
	if err != nil {
		http.Error(w, "Failed to get field report", http.StatusInternalServerError)
		return
	}

	// Update field report status to rejected
	_, err = h.db.Exec(`
		UPDATE field_reports 
		SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, 
		    rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, req.RejectedBy, req.RejectionReason, id)
	if err != nil {
		http.Error(w, "Failed to reject field report", http.StatusInternalServerError)
		return
	}

	// Create notification for the submitter
	go func() {
		submitterUserID, err := websocket.GetUserIDFromSubmittedBy(h.db, submittedBy)
		if err == nil && submitterUserID > 0 {
			var reportTitle string
			h.db.QueryRow("SELECT title FROM field_reports WHERE id = $1", id).Scan(&reportTitle)
			websocket.CreateNotification(
				h.db,
				h.hub,
				submitterUserID,
				"field_report_rejected",
				"Laporan Anda Ditolak",
				fmt.Sprintf("Laporan '%s' ditolak oleh %s. Alasan: %s", reportTitle, req.RejectedBy, req.RejectionReason),
				fmt.Sprintf("/lapangan/work-orders/%d/report", id),
			)
		}
	}()

	// Fetch and return the updated report
	h.GetFieldReport(w, r)
}

