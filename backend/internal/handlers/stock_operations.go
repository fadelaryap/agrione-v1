package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// List Stock Lots
func (h *InventoryHandler) ListStockLots(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	warehouse := r.URL.Query().Get("warehouse")
	status := r.URL.Query().Get("status")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			sl.id, sl.lot_id, sl.batch_no, sl.quantity, sl.unit_cost, sl.total_cost,
			sl.expiry_date, sl.supplier, sl.status, sl.notes, sl.received_date,
			TO_CHAR(sl.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(sl.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			sl.item_id, sl.warehouse_id,
			i.sku, i.name as item_name, i.category, i.unit,
			p.id as plot_id, p.name as plot_name, p.description as plot_description, 
			p.type as plot_type, p.apikey, p.coordinates as plot_coordinates, p.field_ref,
			TO_CHAR(p.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as plot_created_at,
			TO_CHAR(p.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as plot_updated_at
		FROM stock_lots sl
		JOIN inventory_items i ON sl.item_id = i.id
		JOIN plots p ON sl.warehouse_id = p.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if search != "" {
		query += fmt.Sprintf(" AND (sl.lot_id ILIKE $%d OR sl.batch_no ILIKE $%d OR i.name ILIKE $%d OR sl.supplier ILIKE $%d) ", argIndex, argIndex, argIndex, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}
	if warehouse != "" && warehouse != "all" {
		query += fmt.Sprintf(" AND sl.warehouse_id = $%d ", argIndex)
		warehouseID, _ := strconv.Atoi(warehouse)
		args = append(args, warehouseID)
		argIndex++
	}
	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND sl.status = $%d ", argIndex)
		args = append(args, status)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY sl.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to get stock lots", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var lots []StockLot
	for rows.Next() {
		var lot StockLot
		var item InventoryItem
		var expiryDate, notes, receivedDate, createdAt, updatedAt, plotDescription sql.NullString
		var plotCoordinatesJSON []byte
		var plotFieldRef sql.NullInt64
		var plotCreatedAt, plotUpdatedAt sql.NullString

		var itemID, warehouseID int
		err := rows.Scan(
			&lot.ID, &lot.LotID, &lot.BatchNo, &lot.Quantity, &lot.UnitCost, &lot.TotalCost,
			&expiryDate, &lot.Supplier, &lot.Status, &notes, &receivedDate,
			&createdAt, &updatedAt,
			&itemID, &warehouseID,
			&item.SKU, &item.Name, &item.Category, &item.Unit,
			&lot.Warehouse.ID, &lot.Warehouse.Name, &plotDescription, &lot.Warehouse.Type,
			&lot.Warehouse.APIKey, &plotCoordinatesJSON, &plotFieldRef,
			&plotCreatedAt, &plotUpdatedAt,
		)
		
		item.ID = itemID

		if err != nil {
			continue
		}

		lot.Item = item

		if expiryDate.Valid {
			lot.ExpiryDate = &expiryDate.String
		}
		if notes.Valid {
			lot.Notes = &notes.String
		}
		if receivedDate.Valid {
			lot.ReceivedDate = receivedDate.String
		}
		if createdAt.Valid {
			lot.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			lot.UpdatedAt = updatedAt.String
		}

		if plotDescription.Valid {
			lot.Warehouse.Description = &plotDescription.String
		}
		if plotFieldRef.Valid {
			id := int(plotFieldRef.Int64)
			lot.Warehouse.FieldRef = &id
		}
		json.Unmarshal(plotCoordinatesJSON, &lot.Warehouse.Coordinates)
		if plotCreatedAt.Valid {
			lot.Warehouse.CreatedAt = plotCreatedAt.String
		}
		if plotUpdatedAt.Valid {
			lot.Warehouse.UpdatedAt = plotUpdatedAt.String
		}

		lots = append(lots, lot)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lots)
}

// Create Stock Lot
func (h *InventoryHandler) CreateStockLot(w http.ResponseWriter, r *http.Request) {
	var req CreateStockLotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ItemID == 0 || req.WarehouseID == 0 || req.BatchNo == "" || req.Quantity <= 0 || req.UnitCost <= 0 || req.Supplier == "" {
		http.Error(w, "item_id, warehouse_id, batch_no, quantity, unit_cost, and supplier are required", http.StatusBadRequest)
		return
	}

	// Verify item exists
	var itemExists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = $1)", req.ItemID).Scan(&itemExists)
	if err != nil || !itemExists {
		http.Error(w, "Inventory item not found", http.StatusNotFound)
		return
	}

	// Verify warehouse (plot) exists and is storage/warehouse type
	var plotType string
	err = h.db.QueryRow("SELECT type FROM plots WHERE id = $1", req.WarehouseID).Scan(&plotType)
	if err == sql.ErrNoRows {
		http.Error(w, "Warehouse not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if plotType != "storage" && plotType != "warehouse" {
		http.Error(w, "Plot must be of type 'storage' or 'warehouse'", http.StatusBadRequest)
		return
	}

	lotID := generateID("LOT")
	totalCost := req.Quantity * req.UnitCost

	var expiryDate sql.NullString
	if req.ExpiryDate != nil && *req.ExpiryDate != "" {
		expiryDate.String = *req.ExpiryDate
		expiryDate.Valid = true
	}

	var lot StockLot
	var notes sql.NullString
	var expiryDateOut, createdAt, updatedAt, receivedDate sql.NullString

	err = h.db.QueryRow(`
		INSERT INTO stock_lots (lot_id, item_id, warehouse_id, batch_no, quantity, unit_cost, total_cost, expiry_date, supplier, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, lot_id, batch_no, quantity, unit_cost, total_cost, expiry_date, supplier, status, notes, received_date,
		          TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		          TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
	`, lotID, req.ItemID, req.WarehouseID, req.BatchNo, req.Quantity, req.UnitCost, totalCost, expiryDate, req.Supplier, req.Notes).Scan(
		&lot.ID, &lot.LotID, &lot.BatchNo, &lot.Quantity, &lot.UnitCost, &lot.TotalCost,
		&expiryDateOut, &lot.Supplier, &lot.Status, &notes, &receivedDate,
		&createdAt, &updatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create stock lot", http.StatusInternalServerError)
		return
	}

	// Update item avg_cost
	h.db.Exec("UPDATE inventory_items SET avg_cost = $1 WHERE id = $2", req.UnitCost, req.ItemID)

	// Create stock movement record
	movementID := generateID("MOV")
	h.db.Exec(`
		INSERT INTO stock_movements (movement_id, item_id, lot_id, warehouse_id, type, quantity, unit_cost, total_cost, reason, reference, performed_by, notes)
		VALUES ($1, $2, $3, $4, 'in', $5, $6, $7, 'Stock Receipt', $8, 'System', $9)
	`, movementID, req.ItemID, lot.ID, req.WarehouseID, req.Quantity, req.UnitCost, totalCost, req.BatchNo, req.Notes)

	// Populate item and warehouse
	h.db.QueryRow("SELECT id, sku, name, category, unit FROM inventory_items WHERE id = $1", req.ItemID).Scan(
		&lot.Item.ID, &lot.Item.SKU, &lot.Item.Name, &lot.Item.Category, &lot.Item.Unit)

	var plotCoordinatesJSON []byte
	var plotDescription sql.NullString
	var plotFieldRef sql.NullInt64
	h.db.QueryRow(`
		SELECT id, name, description, type, apikey, coordinates, field_ref,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM plots WHERE id = $1
	`, req.WarehouseID).Scan(
		&lot.Warehouse.ID, &lot.Warehouse.Name, &plotDescription, &lot.Warehouse.Type,
		&lot.Warehouse.APIKey, &plotCoordinatesJSON, &plotFieldRef,
		&lot.Warehouse.CreatedAt, &lot.Warehouse.UpdatedAt,
	)

	if plotDescription.Valid {
		lot.Warehouse.Description = &plotDescription.String
	}
	if plotFieldRef.Valid {
		id := int(plotFieldRef.Int64)
		lot.Warehouse.FieldRef = &id
	}
	json.Unmarshal(plotCoordinatesJSON, &lot.Warehouse.Coordinates)

	if expiryDateOut.Valid {
		lot.ExpiryDate = &expiryDateOut.String
	}
	if notes.Valid {
		lot.Notes = &notes.String
	}
	if receivedDate.Valid {
		lot.ReceivedDate = receivedDate.String
	}
	if createdAt.Valid {
		lot.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		lot.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(lot)
}

// Remove Stock (decrease quantity)
func (h *InventoryHandler) RemoveStock(w http.ResponseWriter, r *http.Request) {
	var req RemoveStockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.LotID == 0 || req.Quantity <= 0 || req.Reason == "" || req.PerformedBy == "" {
		http.Error(w, "lot_id, quantity, reason, and performed_by are required", http.StatusBadRequest)
		return
	}

	// Get stock lot
	var lot StockLot
	var itemID, warehouseID int
	var unitCost float64
	err := h.db.QueryRow(`
		SELECT id, lot_id, item_id, warehouse_id, quantity, unit_cost, status
		FROM stock_lots WHERE id = $1
	`, req.LotID).Scan(&lot.ID, &lot.LotID, &itemID, &warehouseID, &lot.Quantity, &unitCost, &lot.Status)

	if err == sql.ErrNoRows {
		http.Error(w, "Stock lot not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if lot.Status != "available" {
		http.Error(w, "Stock lot is not available", http.StatusBadRequest)
		return
	}

	if req.Quantity > lot.Quantity {
		http.Error(w, "Quantity to remove exceeds available quantity", http.StatusBadRequest)
		return
	}

	newQuantity := lot.Quantity - req.Quantity
	totalCost := req.Quantity * unitCost

	// Update stock lot
	var newStatus string
	if newQuantity <= 0 {
		newStatus = "depleted"
		newQuantity = 0
	} else {
		newStatus = lot.Status
	}

	_, err = h.db.Exec(`
		UPDATE stock_lots SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
	`, newQuantity, newStatus, req.LotID)

	if err != nil {
		http.Error(w, "Failed to update stock lot", http.StatusInternalServerError)
		return
	}

	// Create stock movement
	movementID := generateID("MOV")
	var reference sql.NullString
	if req.Reference != nil {
		reference.String = *req.Reference
		reference.Valid = true
	}
	var stockRequestID sql.NullInt64
	if req.StockRequestID != nil {
		stockRequestID.Int64 = int64(*req.StockRequestID)
		stockRequestID.Valid = true
	}

	_, err = h.db.Exec(`
		INSERT INTO stock_movements (movement_id, item_id, lot_id, warehouse_id, type, quantity, unit_cost, total_cost, reason, reference, performed_by, notes, stock_request_id)
		VALUES ($1, $2, $3, $4, 'out', $5, $6, $7, $8, $9, $10, $11, $12)
	`, movementID, itemID, req.LotID, warehouseID, req.Quantity, unitCost, totalCost, req.Reason, reference, req.PerformedBy, req.Notes, stockRequestID)

	if err != nil {
		http.Error(w, "Failed to create stock movement", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// List Stock Movements
func (h *InventoryHandler) ListStockMovements(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	movementType := r.URL.Query().Get("type")
	itemID := r.URL.Query().Get("item_id")
	warehouseID := r.URL.Query().Get("warehouse_id")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			sm.id, sm.movement_id, sm.type, sm.quantity, sm.unit_cost, sm.total_cost,
			sm.reason, sm.reference, sm.performed_by, sm.notes,
			TO_CHAR(sm.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
			TO_CHAR(sm.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at,
			sm.item_id, sm.lot_id, sm.warehouse_id,
			i.sku, i.name as item_name, i.category, i.unit,
			p.id as plot_id, p.name as plot_name, p.description as plot_description,
			p.type as plot_type, p.apikey, p.coordinates as plot_coordinates, p.field_ref,
			TO_CHAR(p.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as plot_created_at,
			TO_CHAR(p.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as plot_updated_at
		FROM stock_movements sm
		JOIN inventory_items i ON sm.item_id = i.id
		JOIN plots p ON sm.warehouse_id = p.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if search != "" {
		query += fmt.Sprintf(" AND (sm.movement_id ILIKE $%d OR sm.reason ILIKE $%d OR sm.reference ILIKE $%d OR i.name ILIKE $%d OR sm.performed_by ILIKE $%d) ", argIndex, argIndex, argIndex, argIndex, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}
	if movementType != "" && movementType != "all" {
		query += fmt.Sprintf(" AND sm.type = $%d ", argIndex)
		args = append(args, movementType)
		argIndex++
	}
	if itemID != "" && itemID != "all" {
		query += fmt.Sprintf(" AND sm.item_id = $%d ", argIndex)
		id, _ := strconv.Atoi(itemID)
		args = append(args, id)
		argIndex++
	}
	if warehouseID != "" && warehouseID != "all" {
		query += fmt.Sprintf(" AND sm.warehouse_id = $%d ", argIndex)
		id, _ := strconv.Atoi(warehouseID)
		args = append(args, id)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY sm.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to get stock movements", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var movements []StockMovement
	for rows.Next() {
		var movement StockMovement
		var item InventoryItem
		var lotID sql.NullInt64
		var reference, notes, createdAt, updatedAt sql.NullString
		var plotCoordinatesJSON []byte
		var plotDescription sql.NullString
		var plotFieldRef sql.NullInt64
		var plotCreatedAt, plotUpdatedAt sql.NullString

		var itemID, warehouseID int
		err := rows.Scan(
			&movement.ID, &movement.MovementID, &movement.Type, &movement.Quantity,
			&movement.UnitCost, &movement.TotalCost, &movement.Reason, &reference,
			&movement.PerformedBy, &notes, &createdAt, &updatedAt,
			&itemID, &lotID, &warehouseID,
			&item.SKU, &item.Name, &item.Category, &item.Unit,
			&movement.Warehouse.ID, &movement.Warehouse.Name, &plotDescription, &movement.Warehouse.Type,
			&movement.Warehouse.APIKey, &plotCoordinatesJSON, &plotFieldRef,
			&plotCreatedAt, &plotUpdatedAt,
		)
		
		item.ID = itemID

		if err != nil {
			continue
		}

		movement.Item = item

		if lotID.Valid {
			// Load lot if exists
			var lot StockLot
			err = h.db.QueryRow("SELECT id, lot_id FROM stock_lots WHERE id = $1", lotID.Int64).Scan(&lot.ID, &lot.LotID)
			if err == nil {
				movement.Lot = &lot
			}
		}

		if reference.Valid {
			movement.Reference = &reference.String
		}
		if notes.Valid {
			movement.Notes = &notes.String
		}
		if createdAt.Valid {
			movement.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			movement.UpdatedAt = updatedAt.String
		}

		if plotDescription.Valid {
			movement.Warehouse.Description = &plotDescription.String
		}
		if plotFieldRef.Valid {
			id := int(plotFieldRef.Int64)
			movement.Warehouse.FieldRef = &id
		}
		json.Unmarshal(plotCoordinatesJSON, &movement.Warehouse.Coordinates)
		if plotCreatedAt.Valid {
			movement.Warehouse.CreatedAt = plotCreatedAt.String
		}
		if plotUpdatedAt.Valid {
			movement.Warehouse.UpdatedAt = plotUpdatedAt.String
		}

		movements = append(movements, movement)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movements)
}

// Get Inventory Stats
func (h *InventoryHandler) GetInventoryStats(w http.ResponseWriter, r *http.Request) {
	var stats InventoryStats

	// Total items
	err := h.db.QueryRow("SELECT COUNT(*) FROM inventory_items WHERE status = 'active'").Scan(&stats.TotalItems)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	// Stock value
	err = h.db.QueryRow(`
		SELECT COALESCE(SUM(total_cost), 0) FROM stock_lots WHERE status = 'available'
	`).Scan(&stats.StockValue)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	// Total warehouses (storage/warehouse plots)
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM plots WHERE type IN ('storage', 'warehouse')
	`).Scan(&stats.TotalWarehouses)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	// Low stock count (items below reorder point)
	err = h.db.QueryRow(`
		SELECT COUNT(DISTINCT i.id)
		FROM inventory_items i
		LEFT JOIN stock_lots sl ON i.id = sl.item_id AND sl.status = 'available'
		WHERE i.status = 'active'
		GROUP BY i.id, i.reorder_point
		HAVING COALESCE(SUM(sl.quantity), 0) <= i.reorder_point
	`).Scan(&stats.LowStockCount)
	if err != nil && err != sql.ErrNoRows {
		stats.LowStockCount = 0
	}

	// Recent movements (last 7 days)
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM stock_movements WHERE created_at >= $1
	`, sevenDaysAgo).Scan(&stats.RecentMovements)
	if err != nil {
		stats.RecentMovements = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// List Warehouses (storage/warehouse plots)
func (h *InventoryHandler) ListWarehouses(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")

	query := `
		SELECT id, name, description, type, apikey, coordinates, field_ref,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM plots
		WHERE type IN ('storage', 'warehouse')
	`
	args := []interface{}{}

	if search != "" {
		query += " AND (name ILIKE $1 OR description ILIKE $1)"
		args = append(args, "%"+search+"%")
	}

	query += " ORDER BY created_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to get warehouses", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Warehouse struct {
		ID          int         `json:"id"`
		Name        string      `json:"name"`
		Description *string     `json:"description,omitempty"`
		Type        string      `json:"type"`
		APIKey      string      `json:"apikey"`
		Coordinates interface{} `json:"coordinates"`
		FieldRef    *int        `json:"field_ref,omitempty"`
		CreatedAt   string      `json:"created_at"`
		UpdatedAt   string      `json:"updated_at"`
	}

	var warehouses []Warehouse
	for rows.Next() {
		var w Warehouse
		var coordinatesJSON []byte
		var description, createdAt, updatedAt sql.NullString
		var fieldRef sql.NullInt64

		err := rows.Scan(
			&w.ID, &w.Name, &description, &w.Type, &w.APIKey, &coordinatesJSON, &fieldRef,
			&createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}

		if description.Valid {
			w.Description = &description.String
		}
		if fieldRef.Valid {
			id := int(fieldRef.Int64)
			w.FieldRef = &id
		}
		if createdAt.Valid {
			w.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			w.UpdatedAt = updatedAt.String
		}

		json.Unmarshal(coordinatesJSON, &w.Coordinates)
		warehouses = append(warehouses, w)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(warehouses)
}

