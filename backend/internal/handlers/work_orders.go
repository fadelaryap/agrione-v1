package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"agrione/backend/internal/websocket"

	"github.com/gorilla/mux"
)

type WorkOrdersHandler struct {
	db  *sql.DB
	hub *websocket.Hub
}

func NewWorkOrdersHandler(db *sql.DB, hub *websocket.Hub) *WorkOrdersHandler {
	return &WorkOrdersHandler{db: db, hub: hub}
}

type WorkOrder struct {
	ID            int       `json:"id"`
	Title         string    `json:"title"`
	Category      string    `json:"category"`
	Activity      string    `json:"activity"`
	Status        string    `json:"status"`
	Priority      string    `json:"priority"`
	Assignee      string    `json:"assignee"`
	FieldID       *int      `json:"field_id,omitempty"`
	FieldName     *string   `json:"field_name,omitempty"`
	StartDate     string    `json:"start_date"`
	EndDate       string    `json:"end_date"`
	Progress      int       `json:"progress"`
	Description   *string   `json:"description,omitempty"`
	Requirements  []string  `json:"requirements,omitempty"`
	ActualHours   *int      `json:"actual_hours,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedBy     string    `json:"created_by"`
	LastUpdatedBy *string   `json:"last_updated_by,omitempty"`
	CompletedDate *string   `json:"completed_date,omitempty"`
	CreatedAt     string    `json:"created_at"`
	UpdatedAt     string    `json:"updated_at"`
}

type CreateWorkOrderRequest struct {
	Title        string    `json:"title"`
	Category     string    `json:"category"`
	Activity     string    `json:"activity"`
	Status       *string   `json:"status,omitempty"`
	Priority     *string   `json:"priority,omitempty"`
	Assignee     string    `json:"assignee"`
	FieldID      *int      `json:"field_id,omitempty"`
	StartDate    string    `json:"start_date"`
	EndDate      string    `json:"end_date"`
	Progress     *int      `json:"progress,omitempty"`
	Description  *string   `json:"description,omitempty"`
	Requirements []string  `json:"requirements,omitempty"`
	ActualHours  *int      `json:"actual_hours,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
	CreatedBy    string    `json:"created_by"`
}

type UpdateWorkOrderRequest struct {
	Title         *string   `json:"title,omitempty"`
	Category      *string   `json:"category,omitempty"`
	Activity      *string   `json:"activity,omitempty"`
	Status        *string   `json:"status,omitempty"`
	Priority      *string   `json:"priority,omitempty"`
	Assignee      *string   `json:"assignee,omitempty"`
	FieldID       *int      `json:"field_id,omitempty"`
	StartDate     *string   `json:"start_date,omitempty"`
	EndDate       *string   `json:"end_date,omitempty"`
	Progress      *int      `json:"progress,omitempty"`
	Description   *string   `json:"description,omitempty"`
	Requirements  []string  `json:"requirements,omitempty"`
	ActualHours   *int      `json:"actual_hours,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	LastUpdatedBy *string   `json:"last_updated_by,omitempty"`
}

func (h *WorkOrdersHandler) ListWorkOrders(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
	status := r.URL.Query().Get("status")
	category := r.URL.Query().Get("category")
	search := r.URL.Query().Get("search")
	fieldIDStr := r.URL.Query().Get("field_id")
	assignee := r.URL.Query().Get("assignee")

	// Build query
	query := `
		SELECT 
			wo.id, wo.title, wo.category, wo.activity, wo.status, wo.priority,
			wo.assignee, wo.field_id, wo.start_date, wo.end_date, wo.progress,
			wo.description, wo.requirements, wo.actual_hours, wo.notes,
			wo.created_by, wo.last_updated_by, wo.completed_date,
			wo.created_at, wo.updated_at,
			f.name as field_name
		FROM work_orders wo
		LEFT JOIN fields f ON wo.field_id = f.id
		WHERE 1=1
	`
	args := []interface{}{}
	argPos := 1

	if status != "" && status != "all" {
		query += " AND wo.status = $" + strconv.Itoa(argPos)
		args = append(args, status)
		argPos++
	}

	if category != "" && category != "all" {
		query += " AND wo.category = $" + strconv.Itoa(argPos)
		args = append(args, category)
		argPos++
	}

	if fieldIDStr != "" {
		fieldID, err := strconv.Atoi(fieldIDStr)
		if err == nil {
			query += " AND wo.field_id = $" + strconv.Itoa(argPos)
			args = append(args, fieldID)
			argPos++
		}
	}

	if assignee != "" {
		query += " AND wo.assignee = $" + strconv.Itoa(argPos)
		args = append(args, assignee)
		argPos++
	}

	if search != "" {
		query += " AND (wo.title ILIKE $" + strconv.Itoa(argPos) + 
			" OR wo.description ILIKE $" + strconv.Itoa(argPos) + 
			" OR wo.assignee ILIKE $" + strconv.Itoa(argPos) + 
			" OR f.name ILIKE $" + strconv.Itoa(argPos) + ")"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
		argPos += 4
	}

	query += " ORDER BY wo.start_date ASC, wo.created_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to get work orders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var workOrders []WorkOrder
	for rows.Next() {
		var wo WorkOrder
		var requirementsJSON []byte
		var description, notes, lastUpdatedBy, completedDate, createdAt, updatedAt, fieldName sql.NullString
		var fieldID, actualHours sql.NullInt64

		err := rows.Scan(
			&wo.ID, &wo.Title, &wo.Category, &wo.Activity, &wo.Status, &wo.Priority,
			&wo.Assignee, &fieldID, &wo.StartDate, &wo.EndDate, &wo.Progress,
			&description, &requirementsJSON, &actualHours, &notes,
			&wo.CreatedBy, &lastUpdatedBy, &completedDate,
			&createdAt, &updatedAt, &fieldName,
		)

		if err != nil {
			http.Error(w, "Failed to scan work order", http.StatusInternalServerError)
			return
		}

		if fieldID.Valid {
			id := int(fieldID.Int64)
			wo.FieldID = &id
		}
		if fieldName.Valid {
			wo.FieldName = &fieldName.String
		}
		if description.Valid {
			wo.Description = &description.String
		}
		if notes.Valid {
			wo.Notes = &notes.String
		}
		if lastUpdatedBy.Valid {
			wo.LastUpdatedBy = &lastUpdatedBy.String
		}
		if completedDate.Valid {
			wo.CompletedDate = &completedDate.String
		}
		if actualHours.Valid {
			hours := int(actualHours.Int64)
			wo.ActualHours = &hours
		}
		if createdAt.Valid {
			wo.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			wo.UpdatedAt = updatedAt.String
		}

		// Parse requirements JSON
		if len(requirementsJSON) > 0 {
			json.Unmarshal(requirementsJSON, &wo.Requirements)
		}
		if wo.Requirements == nil {
			wo.Requirements = []string{}
		}

		workOrders = append(workOrders, wo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workOrders)
}

func (h *WorkOrdersHandler) GetWorkOrder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid work order ID", http.StatusBadRequest)
		return
	}

	var wo WorkOrder
	var requirementsJSON []byte
	var description, notes, lastUpdatedBy, completedDate, createdAt, updatedAt, fieldName sql.NullString
	var fieldID, actualHours sql.NullInt64

	err = h.db.QueryRow(`
		SELECT 
			wo.id, wo.title, wo.category, wo.activity, wo.status, wo.priority,
			wo.assignee, wo.field_id, wo.start_date, wo.end_date, wo.progress,
			wo.description, wo.requirements, wo.actual_hours, wo.notes,
			wo.created_by, wo.last_updated_by, wo.completed_date,
			TO_CHAR(wo.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at, 
			TO_CHAR(wo.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			f.name as field_name
		FROM work_orders wo
		LEFT JOIN fields f ON wo.field_id = f.id
		WHERE wo.id = $1
	`, id).Scan(
		&wo.ID, &wo.Title, &wo.Category, &wo.Activity, &wo.Status, &wo.Priority,
		&wo.Assignee, &fieldID, &wo.StartDate, &wo.EndDate, &wo.Progress,
		&description, &requirementsJSON, &actualHours, &notes,
		&wo.CreatedBy, &lastUpdatedBy, &completedDate,
		&createdAt, &updatedAt, &fieldName,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Work order not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if fieldID.Valid {
		id := int(fieldID.Int64)
		wo.FieldID = &id
	}
	if fieldName.Valid {
		wo.FieldName = &fieldName.String
	}
	if description.Valid {
		wo.Description = &description.String
	}
	if notes.Valid {
		wo.Notes = &notes.String
	}
	if lastUpdatedBy.Valid {
		wo.LastUpdatedBy = &lastUpdatedBy.String
	}
	if completedDate.Valid {
		wo.CompletedDate = &completedDate.String
	}
	if actualHours.Valid {
		hours := int(actualHours.Int64)
		wo.ActualHours = &hours
	}
	if createdAt.Valid {
		wo.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		wo.UpdatedAt = updatedAt.String
	}

	if len(requirementsJSON) > 0 {
		json.Unmarshal(requirementsJSON, &wo.Requirements)
	}
	if wo.Requirements == nil {
		wo.Requirements = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wo)
}

func (h *WorkOrdersHandler) CreateWorkOrder(w http.ResponseWriter, r *http.Request) {
	var req CreateWorkOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Title == "" || req.Category == "" || req.Activity == "" || req.Assignee == "" || req.CreatedBy == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		http.Error(w, "Invalid start_date format (expected YYYY-MM-DD)", http.StatusBadRequest)
		return
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		http.Error(w, "Invalid end_date format (expected YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Set defaults
	status := "pending"
	if req.Status != nil {
		status = *req.Status
	}
	priority := "medium"
	if req.Priority != nil {
		priority = *req.Priority
	}
	progress := 0
	if req.Progress != nil {
		progress = *req.Progress
	}

	// Convert requirements to JSON
	requirementsJSON, _ := json.Marshal(req.Requirements)
	if req.Requirements == nil {
		requirementsJSON = []byte("[]")
	}

	// Insert work order
	var woID int
	err = h.db.QueryRow(`
		INSERT INTO work_orders (
			title, category, activity, status, priority, assignee, field_id,
			start_date, end_date, progress, description, requirements,
			actual_hours, notes, created_by, last_updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id
	`, req.Title, req.Category, req.Activity, status, priority, req.Assignee, req.FieldID,
		startDate, endDate, progress, req.Description, string(requirementsJSON),
		req.ActualHours, req.Notes, req.CreatedBy, req.CreatedBy).Scan(&woID)

	if err != nil {
		http.Error(w, "Failed to create work order", http.StatusInternalServerError)
		return
	}

	// Create notification for the assignee
	go func() {
		assigneeUserID, err := websocket.GetUserIDFromSubmittedBy(h.db, req.Assignee)
		if err == nil && assigneeUserID > 0 {
			websocket.CreateNotification(
				h.db,
				h.hub,
				assigneeUserID,
				"work_order_new",
				"Work Order Baru",
				fmt.Sprintf("Work order '%s' telah ditugaskan kepada Anda", req.Title),
				fmt.Sprintf("/lapangan/work-orders/%d", woID),
			)
		}
	}()

	// Fetch created work order
	h.GetWorkOrderByID(w, r, woID)
}

func (h *WorkOrdersHandler) UpdateWorkOrder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid work order ID", http.StatusBadRequest)
		return
	}

	var req UpdateWorkOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build update query
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Title != nil {
		updates = append(updates, "title = $"+strconv.Itoa(argPos))
		args = append(args, *req.Title)
		argPos++
	}
	if req.Category != nil {
		updates = append(updates, "category = $"+strconv.Itoa(argPos))
		args = append(args, *req.Category)
		argPos++
	}
	if req.Activity != nil {
		updates = append(updates, "activity = $"+strconv.Itoa(argPos))
		args = append(args, *req.Activity)
		argPos++
	}
	if req.Status != nil {
		updates = append(updates, "status = $"+strconv.Itoa(argPos))
		args = append(args, *req.Status)
		argPos++
		// Auto-set completed_date if status is completed
		if *req.Status == "completed" {
			updates = append(updates, "completed_date = CURRENT_TIMESTAMP")
			updates = append(updates, "progress = 100")
		}
	}
	if req.Priority != nil {
		updates = append(updates, "priority = $"+strconv.Itoa(argPos))
		args = append(args, *req.Priority)
		argPos++
	}
	if req.Assignee != nil {
		updates = append(updates, "assignee = $"+strconv.Itoa(argPos))
		args = append(args, *req.Assignee)
		argPos++
	}
	if req.FieldID != nil {
		updates = append(updates, "field_id = $"+strconv.Itoa(argPos))
		args = append(args, *req.FieldID)
		argPos++
	}
	if req.StartDate != nil {
		startDate, err := time.Parse("2006-01-02", *req.StartDate)
		if err == nil {
			updates = append(updates, "start_date = $"+strconv.Itoa(argPos))
			args = append(args, startDate)
			argPos++
		}
	}
	if req.EndDate != nil {
		endDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err == nil {
			updates = append(updates, "end_date = $"+strconv.Itoa(argPos))
			args = append(args, endDate)
			argPos++
		}
	}
	if req.Progress != nil {
		progress := *req.Progress
		if progress < 0 {
			progress = 0
		}
		if progress > 100 {
			progress = 100
		}
		updates = append(updates, "progress = $"+strconv.Itoa(argPos))
		args = append(args, progress)
		argPos++
		// Auto-update status based on progress
		if progress == 100 {
			updates = append(updates, "status = 'completed'")
			updates = append(updates, "completed_date = CURRENT_TIMESTAMP")
		} else if progress > 0 {
			// Check if status should be in-progress
			var currentStatus string
			h.db.QueryRow("SELECT status FROM work_orders WHERE id = $1", id).Scan(&currentStatus)
			if currentStatus == "pending" {
				updates = append(updates, "status = 'in-progress'")
			}
		}
	}
	if req.Description != nil {
		updates = append(updates, "description = $"+strconv.Itoa(argPos))
		args = append(args, *req.Description)
		argPos++
	}
	if req.Requirements != nil {
		requirementsJSON, _ := json.Marshal(req.Requirements)
		updates = append(updates, "requirements = $"+strconv.Itoa(argPos))
		args = append(args, string(requirementsJSON))
		argPos++
	}
	if req.ActualHours != nil {
		updates = append(updates, "actual_hours = $"+strconv.Itoa(argPos))
		args = append(args, *req.ActualHours)
		argPos++
	}
	if req.Notes != nil {
		updates = append(updates, "notes = $"+strconv.Itoa(argPos))
		args = append(args, *req.Notes)
		argPos++
	}
	if req.LastUpdatedBy != nil {
		updates = append(updates, "last_updated_by = $"+strconv.Itoa(argPos))
		args = append(args, *req.LastUpdatedBy)
		argPos++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	updates = append(updates, "id = $"+strconv.Itoa(argPos))
	args = append(args, id)

	query := "UPDATE work_orders SET " + strings.Join(updates[:len(updates)-1], ", ") + " WHERE " + updates[len(updates)-1]

	_, err = h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update work order", http.StatusInternalServerError)
		return
	}

	// Return updated work order
	h.GetWorkOrderByID(w, r, id)
}

func (h *WorkOrdersHandler) DeleteWorkOrder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid work order ID", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM work_orders WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete work order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// Helper function to get work order by ID
func (h *WorkOrdersHandler) GetWorkOrderByID(w http.ResponseWriter, r *http.Request, id int) {
	var wo WorkOrder
	var requirementsJSON []byte
	var description, notes, lastUpdatedBy, completedDate, createdAt, updatedAt, fieldName sql.NullString
	var fieldID, actualHours sql.NullInt64

	err := h.db.QueryRow(`
		SELECT 
			wo.id, wo.title, wo.category, wo.activity, wo.status, wo.priority,
			wo.assignee, wo.field_id, wo.start_date, wo.end_date, wo.progress,
			wo.description, wo.requirements, wo.actual_hours, wo.notes,
			wo.created_by, wo.last_updated_by, wo.completed_date,
			wo.created_at, wo.updated_at,
			f.name as field_name
		FROM work_orders wo
		LEFT JOIN fields f ON wo.field_id = f.id
		WHERE wo.id = $1
	`, id).Scan(
		&wo.ID, &wo.Title, &wo.Category, &wo.Activity, &wo.Status, &wo.Priority,
		&wo.Assignee, &fieldID, &wo.StartDate, &wo.EndDate, &wo.Progress,
		&description, &requirementsJSON, &actualHours, &notes,
		&wo.CreatedBy, &lastUpdatedBy, &completedDate,
		&createdAt, &updatedAt, &fieldName,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve work order", http.StatusInternalServerError)
		return
	}

	if fieldID.Valid {
		id := int(fieldID.Int64)
		wo.FieldID = &id
	}
	if fieldName.Valid {
		wo.FieldName = &fieldName.String
	}
	if description.Valid {
		wo.Description = &description.String
	}
	if notes.Valid {
		wo.Notes = &notes.String
	}
	if lastUpdatedBy.Valid {
		wo.LastUpdatedBy = &lastUpdatedBy.String
	}
	if completedDate.Valid {
		wo.CompletedDate = &completedDate.String
	}
	if actualHours.Valid {
		hours := int(actualHours.Int64)
		wo.ActualHours = &hours
	}
	if createdAt.Valid {
		wo.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		wo.UpdatedAt = updatedAt.String
	}

	if len(requirementsJSON) > 0 {
		json.Unmarshal(requirementsJSON, &wo.Requirements)
	}
	if wo.Requirements == nil {
		wo.Requirements = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wo)
}

