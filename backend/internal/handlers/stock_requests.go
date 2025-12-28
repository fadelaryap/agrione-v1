package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"agrione/backend/internal/websocket"

	"github.com/gorilla/mux"
)

// Stock Request types
type StockRequest struct {
	ID              int       `json:"id"`
	RequestID       string    `json:"request_id"`
	WorkOrderID     int       `json:"work_order_id"`
	WorkOrderTitle  *string   `json:"work_order_title,omitempty"`
	Item            InventoryItem `json:"item"`
	Quantity        float64   `json:"quantity"`
	WarehouseID     *int      `json:"warehouse_id,omitempty"`
	Warehouse       *struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		Description *string `json:"description,omitempty"`
		Type        string  `json:"type"`
		APIKey      string  `json:"apikey"`
		Coordinates interface{} `json:"coordinates"`
		FieldRef    *int    `json:"field_ref,omitempty"`
		CreatedAt   string  `json:"created_at"`
		UpdatedAt   string  `json:"updated_at"`
	} `json:"warehouse,omitempty"`
	Status          string    `json:"status"`
	RequestedBy     string    `json:"requested_by"`
	ApprovedBy      *string   `json:"approved_by,omitempty"`
	ApprovedAt      *string   `json:"approved_at,omitempty"`
	RejectionReason *string   `json:"rejection_reason,omitempty"`
	FulfilledAt     *string   `json:"fulfilled_at,omitempty"`
	Notes           *string   `json:"notes,omitempty"`
	AvailableStock  *float64  `json:"available_stock,omitempty"` // Available stock in warehouse
	CreatedAt       string    `json:"created_at"`
	UpdatedAt       string    `json:"updated_at"`
}

type CreateStockRequestRequest struct {
	WorkOrderID int     `json:"work_order_id"`
	ItemID      int     `json:"item_id"`
	Quantity    float64 `json:"quantity"`
	WarehouseID *int    `json:"warehouse_id,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	RequestedBy string  `json:"requested_by"`
}

type ApproveStockRequestRequest struct {
	ApprovedBy string  `json:"approved_by"`
	Notes      *string `json:"notes,omitempty"`
}

type RejectStockRequestRequest struct {
	RejectedBy       string  `json:"rejected_by"`
	RejectionReason  string  `json:"rejection_reason"`
}

func generateRequestID() string {
	return fmt.Sprintf("REQ-%d-%s", time.Now().Unix(), fmt.Sprintf("%04d", rand.Intn(10000)))
}

// List Stock Requests
func (h *InventoryHandler) ListStockRequests(w http.ResponseWriter, r *http.Request) {
	workOrderID := r.URL.Query().Get("work_order_id")
	status := r.URL.Query().Get("status")
	itemID := r.URL.Query().Get("item_id")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			sr.id, sr.request_id, sr.work_order_id, sr.item_id, sr.quantity, 
			sr.warehouse_id, sr.status, sr.requested_by, sr.approved_by, 
			sr.approved_at, sr.rejection_reason, sr.fulfilled_at, sr.notes,
			TO_CHAR(sr.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(sr.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			wo.title as work_order_title,
			i.id as item_id_col, i.sku, i.name as item_name, i.category, i.unit,
			i.reorder_point, i.status as item_status, i.avg_cost, i.description as item_description, i.suppliers
		FROM stock_requests sr
		JOIN work_orders wo ON sr.work_order_id = wo.id
		JOIN inventory_items i ON sr.item_id = i.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if workOrderID != "" && workOrderID != "all" {
		query += fmt.Sprintf(" AND sr.work_order_id = $%d ", argIndex)
		id, _ := strconv.Atoi(workOrderID)
		args = append(args, id)
		argIndex++
	}
	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND sr.status = $%d ", argIndex)
		args = append(args, status)
		argIndex++
	}
	if itemID != "" && itemID != "all" {
		query += fmt.Sprintf(" AND sr.item_id = $%d ", argIndex)
		id, _ := strconv.Atoi(itemID)
		args = append(args, id)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY sr.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to get stock requests", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var requests []StockRequest
	for rows.Next() {
		var req StockRequest
		var item InventoryItem
		var workOrderTitle sql.NullString
		var warehouseID sql.NullInt64
		var approvedBy, approvedAt, rejectionReason, fulfilledAt, notes, itemDescription, createdAt, updatedAt sql.NullString
		var suppliersJSON []byte

		err := rows.Scan(
			&req.ID, &req.RequestID, &req.WorkOrderID, &req.Item.ID, &req.Quantity,
			&warehouseID, &req.Status, &req.RequestedBy, &approvedBy,
			&approvedAt, &rejectionReason, &fulfilledAt, &notes,
			&createdAt, &updatedAt,
			&workOrderTitle,
			&item.ID, &item.SKU, &item.Name, &item.Category, &item.Unit,
			&item.ReorderPoint, &item.Status, &item.AvgCost, &itemDescription, &suppliersJSON,
		)

		if err != nil {
			continue
		}

		req.Item = item
		if workOrderTitle.Valid {
			req.WorkOrderTitle = &workOrderTitle.String
		}
		if warehouseID.Valid {
			id := int(warehouseID.Int64)
			req.WarehouseID = &id
			
			// Load warehouse details if exists
			var plotCoordinatesJSON []byte
			var plotDescription sql.NullString
			var plotFieldRef sql.NullInt64
			var plotCreatedAt, plotUpdatedAt sql.NullString
			warehouse := &struct {
				ID          int     `json:"id"`
				Name        string  `json:"name"`
				Description *string `json:"description,omitempty"`
				Type        string  `json:"type"`
				APIKey      string  `json:"apikey"`
				Coordinates interface{} `json:"coordinates"`
				FieldRef    *int    `json:"field_ref,omitempty"`
				CreatedAt   string  `json:"created_at"`
				UpdatedAt   string  `json:"updated_at"`
			}{}

			err = h.db.QueryRow(`
				SELECT id, name, description, type, apikey, coordinates, field_ref,
				       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
				       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
				FROM plots WHERE id = $1
			`, id).Scan(
				&warehouse.ID, &warehouse.Name, &plotDescription, &warehouse.Type,
				&warehouse.APIKey, &plotCoordinatesJSON, &plotFieldRef,
				&plotCreatedAt, &plotUpdatedAt,
			)

			if err == nil {
				if plotDescription.Valid {
					warehouse.Description = &plotDescription.String
				}
				if plotFieldRef.Valid {
					id := int(plotFieldRef.Int64)
					warehouse.FieldRef = &id
				}
				json.Unmarshal(plotCoordinatesJSON, &warehouse.Coordinates)
				if plotCreatedAt.Valid {
					warehouse.CreatedAt = plotCreatedAt.String
				}
				if plotUpdatedAt.Valid {
					warehouse.UpdatedAt = plotUpdatedAt.String
				}
				req.Warehouse = warehouse
			}
		}

		if approvedBy.Valid {
			req.ApprovedBy = &approvedBy.String
		}
		if approvedAt.Valid {
			req.ApprovedAt = &approvedAt.String
		}
		if rejectionReason.Valid {
			req.RejectionReason = &rejectionReason.String
		}
		if fulfilledAt.Valid {
			req.FulfilledAt = &fulfilledAt.String
		}
		if notes.Valid {
			req.Notes = &notes.String
		}
		if itemDescription.Valid {
			req.Item.Description = &itemDescription.String
		}
		json.Unmarshal(suppliersJSON, &req.Item.Suppliers)
		if req.Item.Suppliers == nil {
			req.Item.Suppliers = []string{}
		}
		if createdAt.Valid {
			req.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			req.UpdatedAt = updatedAt.String
		}

		// Calculate available stock if warehouse is specified
		if req.WarehouseID != nil {
			var availableStock sql.NullFloat64
			err = h.db.QueryRow(`
				SELECT COALESCE(SUM(quantity), 0)
				FROM stock_lots
				WHERE item_id = $1 AND warehouse_id = $2 AND status = 'available'
			`, req.Item.ID, req.WarehouseID).Scan(&availableStock)
			if err == nil && availableStock.Valid {
				req.AvailableStock = &availableStock.Float64
			}
		}

		requests = append(requests, req)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// Get Stock Request
func (h *InventoryHandler) GetStockRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid stock request ID", http.StatusBadRequest)
		return
	}

	var req StockRequest
	var item InventoryItem
	var workOrderTitle sql.NullString
	var warehouseID sql.NullInt64
	var approvedBy, approvedAt, rejectionReason, fulfilledAt, notes, itemDescription, createdAt, updatedAt sql.NullString
	var suppliersJSON []byte

	err = h.db.QueryRow(`
		SELECT 
			sr.id, sr.request_id, sr.work_order_id, sr.item_id, sr.quantity, 
			sr.warehouse_id, sr.status, sr.requested_by, sr.approved_by, 
			sr.approved_at, sr.rejection_reason, sr.fulfilled_at, sr.notes,
			TO_CHAR(sr.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(sr.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			wo.title as work_order_title,
			i.id as item_id_col, i.sku, i.name as item_name, i.category, i.unit,
			i.reorder_point, i.status as item_status, i.avg_cost, i.description as item_description, i.suppliers
		FROM stock_requests sr
		JOIN work_orders wo ON sr.work_order_id = wo.id
		JOIN inventory_items i ON sr.item_id = i.id
		WHERE sr.id = $1
	`, id).Scan(
		&req.ID, &req.RequestID, &req.WorkOrderID, &req.Item.ID, &req.Quantity,
		&warehouseID, &req.Status, &req.RequestedBy, &approvedBy,
		&approvedAt, &rejectionReason, &fulfilledAt, &notes,
		&createdAt, &updatedAt,
		&workOrderTitle,
		&item.ID, &item.SKU, &item.Name, &item.Category, &item.Unit,
		&item.ReorderPoint, &item.Status, &item.AvgCost, &itemDescription, &suppliersJSON,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Stock request not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	req.Item = item
	if workOrderTitle.Valid {
		req.WorkOrderTitle = &workOrderTitle.String
	}
	if warehouseID.Valid {
		id := int(warehouseID.Int64)
		req.WarehouseID = &id

			// Load warehouse details
			var plotCoordinatesJSON []byte
			var plotDescription sql.NullString
			var plotFieldRef sql.NullInt64
			var plotCreatedAt, plotUpdatedAt sql.NullString
			warehouse := &struct {
				ID          int     `json:"id"`
				Name        string  `json:"name"`
				Description *string `json:"description,omitempty"`
				Type        string  `json:"type"`
				APIKey      string  `json:"apikey"`
				Coordinates interface{} `json:"coordinates"`
				FieldRef    *int    `json:"field_ref,omitempty"`
				CreatedAt   string  `json:"created_at"`
				UpdatedAt   string  `json:"updated_at"`
			}{}

			err = h.db.QueryRow(`
				SELECT id, name, description, type, apikey, coordinates, field_ref,
				       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
				       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
				FROM plots WHERE id = $1
			`, id).Scan(
				&warehouse.ID, &warehouse.Name, &plotDescription, &warehouse.Type,
				&warehouse.APIKey, &plotCoordinatesJSON, &plotFieldRef,
				&plotCreatedAt, &plotUpdatedAt,
			)

			if err == nil {
				if plotDescription.Valid {
					warehouse.Description = &plotDescription.String
				}
				if plotFieldRef.Valid {
					id := int(plotFieldRef.Int64)
					warehouse.FieldRef = &id
				}
				json.Unmarshal(plotCoordinatesJSON, &warehouse.Coordinates)
				if plotCreatedAt.Valid {
					warehouse.CreatedAt = plotCreatedAt.String
				}
				if plotUpdatedAt.Valid {
					warehouse.UpdatedAt = plotUpdatedAt.String
				}
				req.Warehouse = warehouse

			// Calculate available stock
			var availableStock sql.NullFloat64
			err = h.db.QueryRow(`
				SELECT COALESCE(SUM(quantity), 0)
				FROM stock_lots
				WHERE item_id = $1 AND warehouse_id = $2 AND status = 'available'
			`, req.Item.ID, req.WarehouseID).Scan(&availableStock)
			if err == nil && availableStock.Valid {
				req.AvailableStock = &availableStock.Float64
			}
		}
	}

	if approvedBy.Valid {
		req.ApprovedBy = &approvedBy.String
	}
	if approvedAt.Valid {
		req.ApprovedAt = &approvedAt.String
	}
	if rejectionReason.Valid {
		req.RejectionReason = &rejectionReason.String
	}
	if fulfilledAt.Valid {
		req.FulfilledAt = &fulfilledAt.String
	}
	if notes.Valid {
		req.Notes = &notes.String
	}
	if itemDescription.Valid {
		req.Item.Description = &itemDescription.String
	}
	json.Unmarshal(suppliersJSON, &req.Item.Suppliers)
	if req.Item.Suppliers == nil {
		req.Item.Suppliers = []string{}
	}
	if createdAt.Valid {
		req.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		req.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(req)
}

// Create Stock Request (usually called automatically from work order creation)
func (h *InventoryHandler) CreateStockRequest(w http.ResponseWriter, r *http.Request) {
	var req CreateStockRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkOrderID == 0 || req.ItemID == 0 || req.Quantity <= 0 || req.RequestedBy == "" {
		http.Error(w, "work_order_id, item_id, quantity, and requested_by are required", http.StatusBadRequest)
		return
	}

	// Verify work order exists
	var workOrderExists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM work_orders WHERE id = $1)", req.WorkOrderID).Scan(&workOrderExists)
	if err != nil || !workOrderExists {
		http.Error(w, "Work order not found", http.StatusNotFound)
		return
	}

	// Verify item exists
	var itemExists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = $1)", req.ItemID).Scan(&itemExists)
	if err != nil || !itemExists {
		http.Error(w, "Inventory item not found", http.StatusNotFound)
		return
	}

	// Verify warehouse if provided
	if req.WarehouseID != nil && *req.WarehouseID > 0 {
		var plotType string
		err = h.db.QueryRow("SELECT type FROM plots WHERE id = $1", req.WarehouseID).Scan(&plotType)
		if err == sql.ErrNoRows {
			http.Error(w, "Warehouse not found", http.StatusNotFound)
			return
		}
		if plotType != "storage" && plotType != "warehouse" {
			http.Error(w, "Plot must be of type 'storage' or 'warehouse'", http.StatusBadRequest)
			return
		}
	}

	requestID := generateRequestID()

	var stockReq StockRequest
	var approvedBy, approvedAt, rejectionReason, fulfilledAt, notes, createdAt, updatedAt sql.NullString
	var warehouseID sql.NullInt64

	err = h.db.QueryRow(`
		INSERT INTO stock_requests (request_id, work_order_id, item_id, quantity, warehouse_id, status, requested_by, notes)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
		RETURNING id, request_id, work_order_id, item_id, quantity, warehouse_id, status, requested_by,
		          approved_by, approved_at, rejection_reason, fulfilled_at, notes,
		          TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		          TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
	`, requestID, req.WorkOrderID, req.ItemID, req.Quantity, req.WarehouseID, req.RequestedBy, req.Notes).Scan(
		&stockReq.ID, &stockReq.RequestID, &stockReq.WorkOrderID, &stockReq.Item.ID, &stockReq.Quantity,
		&warehouseID, &stockReq.Status, &stockReq.RequestedBy, &approvedBy,
		&approvedAt, &rejectionReason, &fulfilledAt, &notes,
		&createdAt, &updatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create stock request", http.StatusInternalServerError)
		return
	}

	// Load item details
	var itemDescription sql.NullString
	var suppliersJSON []byte
	h.db.QueryRow("SELECT id, sku, name, category, unit, reorder_point, status, avg_cost, description, suppliers FROM inventory_items WHERE id = $1", req.ItemID).Scan(
		&stockReq.Item.ID, &stockReq.Item.SKU, &stockReq.Item.Name, &stockReq.Item.Category, &stockReq.Item.Unit,
		&stockReq.Item.ReorderPoint, &stockReq.Item.Status, &stockReq.Item.AvgCost, &itemDescription, &suppliersJSON,
	)
	if itemDescription.Valid {
		stockReq.Item.Description = &itemDescription.String
	}
	json.Unmarshal(suppliersJSON, &stockReq.Item.Suppliers)
	if stockReq.Item.Suppliers == nil {
		stockReq.Item.Suppliers = []string{}
	}

	if warehouseID.Valid {
		id := int(warehouseID.Int64)
		stockReq.WarehouseID = &id
	}
	if notes.Valid {
		stockReq.Notes = &notes.String
	}
	if createdAt.Valid {
		stockReq.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		stockReq.UpdatedAt = updatedAt.String
	}

	// Create notification for warehouse managers (async, hub not available here but notifications will still be created)
	go func() {
		// Get warehouse managers (Level 1, Level 2, warehouse role)
		rows, err := h.db.Query(`
			SELECT id FROM users WHERE role IN ('Level 1', 'Level 2', 'warehouse') AND status = 'approved'
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var userID int
				if err := rows.Scan(&userID); err == nil {
					websocket.CreateNotification(
						h.db,
						nil, // hub not available in handler, but notification will still be created
						userID,
						"stock_request_new",
						"Stock Request Baru",
						fmt.Sprintf("Stock request baru untuk work order #%d", req.WorkOrderID),
						fmt.Sprintf("/inventory/stock-requests/%d", stockReq.ID),
					)
				}
			}
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(stockReq)
}

// Approve Stock Request
func (h *InventoryHandler) ApproveStockRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid stock request ID", http.StatusBadRequest)
		return
	}

	var approveReq ApproveStockRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&approveReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if approveReq.ApprovedBy == "" {
		http.Error(w, "approved_by is required", http.StatusBadRequest)
		return
	}

	// Get stock request
	var stockReq StockRequest
	var quantity float64
	var itemID, workOrderID int
	var warehouseID sql.NullInt64
	var status string

	err = h.db.QueryRow(`
		SELECT id, item_id, quantity, warehouse_id, status, work_order_id
		FROM stock_requests WHERE id = $1
	`, id).Scan(&stockReq.ID, &itemID, &quantity, &warehouseID, &status, &workOrderID)

	if err == sql.ErrNoRows {
		http.Error(w, "Stock request not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if status != "pending" {
		http.Error(w, "Only pending stock requests can be approved", http.StatusBadRequest)
		return
	}

	// Check stock availability if warehouse is specified
	if warehouseID.Valid {
		var availableStock float64
		err = h.db.QueryRow(`
			SELECT COALESCE(SUM(quantity), 0)
			FROM stock_lots
			WHERE item_id = $1 AND warehouse_id = $2 AND status = 'available'
		`, itemID, warehouseID.Int64).Scan(&availableStock)

		if err != nil {
			http.Error(w, "Failed to check stock availability", http.StatusInternalServerError)
			return
		}

		if availableStock < quantity {
			http.Error(w, fmt.Sprintf("Insufficient stock. Available: %.2f, Requested: %.2f", availableStock, quantity), http.StatusBadRequest)
			return
		}
	}

	// Update stock request status
	_, err = h.db.Exec(`
		UPDATE stock_requests 
		SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, approveReq.ApprovedBy, id)

	if err != nil {
		http.Error(w, "Failed to approve stock request", http.StatusInternalServerError)
		return
	}

	// Fetch updated stock request
	h.GetStockRequest(w, r)
}

// Reject Stock Request
func (h *InventoryHandler) RejectStockRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid stock request ID", http.StatusBadRequest)
		return
	}

	var rejectReq RejectStockRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&rejectReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if rejectReq.RejectedBy == "" || rejectReq.RejectionReason == "" {
		http.Error(w, "rejected_by and rejection_reason are required", http.StatusBadRequest)
		return
	}

	// Check if request exists and is pending
	var status string
	err = h.db.QueryRow("SELECT status FROM stock_requests WHERE id = $1", id).Scan(&status)
	if err == sql.ErrNoRows {
		http.Error(w, "Stock request not found", http.StatusNotFound)
		return
	}
	if status != "pending" {
		http.Error(w, "Only pending stock requests can be rejected", http.StatusBadRequest)
		return
	}

	// Update stock request status
	_, err = h.db.Exec(`
		UPDATE stock_requests 
		SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, 
		    rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, rejectReq.RejectedBy, rejectReq.RejectionReason, id)

	if err != nil {
		http.Error(w, "Failed to reject stock request", http.StatusInternalServerError)
		return
	}

	// Fetch updated stock request
	h.GetStockRequest(w, r)
}

// Fulfill Stock Request (fulfill by removing stock and creating movement)
func (h *InventoryHandler) FulfillStockRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid stock request ID", http.StatusBadRequest)
		return
	}

	// Get stock request
	var stockReq StockRequest
	var quantity float64
	var itemID, workOrderID int
	var warehouseID sql.NullInt64
	var status string

	err = h.db.QueryRow(`
		SELECT id, item_id, quantity, warehouse_id, status, work_order_id
		FROM stock_requests WHERE id = $1
	`, id).Scan(&stockReq.ID, &itemID, &quantity, &warehouseID, &status, &workOrderID)

	if err == sql.ErrNoRows {
		http.Error(w, "Stock request not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if status != "approved" {
		http.Error(w, "Only approved stock requests can be fulfilled", http.StatusBadRequest)
		return
	}

	if !warehouseID.Valid {
		http.Error(w, "Warehouse must be specified to fulfill request", http.StatusBadRequest)
		return
	}

	// Find available stock lots to fulfill the request
	// Get stock lots for this item in this warehouse, ordered by FIFO (oldest first)
	rows, err := h.db.Query(`
		SELECT id, quantity, unit_cost
		FROM stock_lots
		WHERE item_id = $1 AND warehouse_id = $2 AND status = 'available' AND quantity > 0
		ORDER BY received_date ASC, created_at ASC
	`, itemID, warehouseID.Int64)

	if err != nil {
		http.Error(w, "Failed to query stock lots", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var remainingQuantity = quantity
	var lotsToUpdate []struct {
		id        int
		quantity  float64
		unitCost  float64
		removeQty float64
	}

	for rows.Next() && remainingQuantity > 0 {
		var lotID int
		var lotQuantity, unitCost float64
		if err := rows.Scan(&lotID, &lotQuantity, &unitCost); err != nil {
			continue
		}

		removeQty := remainingQuantity
		if removeQty > lotQuantity {
			removeQty = lotQuantity
		}

		lotsToUpdate = append(lotsToUpdate, struct {
			id        int
			quantity  float64
			unitCost  float64
			removeQty float64
		}{lotID, lotQuantity, unitCost, removeQty})

		remainingQuantity -= removeQty
	}

	if remainingQuantity > 0 {
		http.Error(w, fmt.Sprintf("Insufficient stock to fulfill request. Need %.2f more units", remainingQuantity), http.StatusBadRequest)
		return
	}

	// Update stock lots and create movements
	for _, lot := range lotsToUpdate {
		newQuantity := lot.quantity - lot.removeQty
		var newStatus string
		if newQuantity <= 0 {
			newStatus = "depleted"
			newQuantity = 0
		} else {
			newStatus = "available"
		}

		_, err = h.db.Exec(`
			UPDATE stock_lots SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
		`, newQuantity, newStatus, lot.id)

		if err != nil {
			http.Error(w, "Failed to update stock lot", http.StatusInternalServerError)
			return
		}

		// Create stock movement
		movementID := fmt.Sprintf("MOV-%d-%s", time.Now().Unix(), fmt.Sprintf("%04d", rand.Intn(10000)))
		totalCost := lot.removeQty * lot.unitCost
		stockRequestID := sql.NullInt64{Int64: int64(id), Valid: true}

		_, err = h.db.Exec(`
			INSERT INTO stock_movements (movement_id, item_id, lot_id, warehouse_id, type, quantity, unit_cost, total_cost, reason, reference, performed_by, notes, stock_request_id)
			VALUES ($1, $2, $3, $4, 'out', $5, $6, $7, $8, $9, $10, $11, $12)
		`, movementID, itemID, lot.id, warehouseID.Int64, lot.removeQty, lot.unitCost, totalCost,
			fmt.Sprintf("Fulfill stock request %s", stockReq.RequestID),
			fmt.Sprintf("Stock Request #%d", id),
			"System",
			fmt.Sprintf("Auto-fulfilled from approved stock request"),
			stockRequestID)

		if err != nil {
			http.Error(w, "Failed to create stock movement", http.StatusInternalServerError)
			return
		}
	}

	// Mark stock request as fulfilled
	_, err = h.db.Exec(`
		UPDATE stock_requests 
		SET status = 'fulfilled', fulfilled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, id)

	if err != nil {
		http.Error(w, "Failed to fulfill stock request", http.StatusInternalServerError)
		return
	}

	// Fetch updated stock request
	h.GetStockRequest(w, r)
}

