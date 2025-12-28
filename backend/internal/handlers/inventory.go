package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type InventoryHandler struct {
	db *sql.DB
}

func NewInventoryHandler(db *sql.DB) *InventoryHandler {
	return &InventoryHandler{db: db}
}

// Inventory Item types
type InventoryItem struct {
	ID          int       `json:"id"`
	SKU         string    `json:"sku"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Unit        string    `json:"unit"`
	ReorderPoint float64  `json:"reorder_point"`
	Status      string    `json:"status"`
	AvgCost     float64   `json:"avg_cost"`
	Description *string   `json:"description,omitempty"`
	Suppliers   []string  `json:"suppliers"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

type CreateInventoryItemRequest struct {
	SKU         string    `json:"sku"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Unit        string    `json:"unit"`
	ReorderPoint float64  `json:"reorder_point"`
	Status      string    `json:"status"`
	AvgCost     float64   `json:"avg_cost"`
	Description *string   `json:"description,omitempty"`
	Suppliers   []string  `json:"suppliers"`
}

type UpdateInventoryItemRequest struct {
	SKU         *string   `json:"sku,omitempty"`
	Name        *string   `json:"name,omitempty"`
	Category    *string   `json:"category,omitempty"`
	Unit        *string   `json:"unit,omitempty"`
	ReorderPoint *float64 `json:"reorder_point,omitempty"`
	Status      *string   `json:"status,omitempty"`
	AvgCost     *float64  `json:"avg_cost,omitempty"`
	Description *string   `json:"description,omitempty"`
	Suppliers   *[]string `json:"suppliers,omitempty"`
}

// Stock Lot types  
// Note: Plot type is imported from plots.go (same package)
type StockLot struct {
	ID          int       `json:"id"`
	LotID       string    `json:"lot_id"`
	Item        InventoryItem `json:"item"`
	Warehouse   struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		Description *string `json:"description,omitempty"`
		Type        string  `json:"type"`
		APIKey      string  `json:"apikey"`
		Coordinates interface{} `json:"coordinates"`
		FieldRef    *int    `json:"field_ref,omitempty"`
		CreatedAt   string  `json:"created_at"`
		UpdatedAt   string  `json:"updated_at"`
	} `json:"warehouse"`
	BatchNo     string    `json:"batch_no"`
	Quantity    float64   `json:"quantity"`
	UnitCost    float64   `json:"unit_cost"`
	TotalCost   float64   `json:"total_cost"`
	ExpiryDate  *string   `json:"expiry_date,omitempty"`
	Supplier    string    `json:"supplier"`
	Status      string    `json:"status"`
	Notes       *string   `json:"notes,omitempty"`
	ReceivedDate string   `json:"received_date"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

type CreateStockLotRequest struct {
	ItemID      int       `json:"item_id"`
	WarehouseID int       `json:"warehouse_id"`
	BatchNo     string    `json:"batch_no"`
	Quantity    float64   `json:"quantity"`
	UnitCost    float64   `json:"unit_cost"`
	ExpiryDate  *string   `json:"expiry_date,omitempty"`
	Supplier    string    `json:"supplier"`
	Notes       *string   `json:"notes,omitempty"`
}

type RemoveStockRequest struct {
	LotID          int       `json:"lot_id"`
	Quantity       float64   `json:"quantity"`
	Reason         string    `json:"reason"`
	Reference      *string   `json:"reference,omitempty"`
	PerformedBy    string    `json:"performed_by"`
	Notes          *string   `json:"notes,omitempty"`
	StockRequestID *int      `json:"stock_request_id,omitempty"`
}

// Stock Movement types
type StockMovement struct {
	ID          int            `json:"id"`
	MovementID  string         `json:"movement_id"`
	Item        InventoryItem  `json:"item"`
	Lot         *StockLot      `json:"lot,omitempty"`
	Warehouse   struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		Description *string `json:"description,omitempty"`
		Type        string  `json:"type"`
		APIKey      string  `json:"apikey"`
		Coordinates interface{} `json:"coordinates"`
		FieldRef    *int    `json:"field_ref,omitempty"`
		CreatedAt   string  `json:"created_at"`
		UpdatedAt   string  `json:"updated_at"`
	} `json:"warehouse"`
	Type        string         `json:"type"`
	Quantity    float64        `json:"quantity"`
	UnitCost    float64        `json:"unit_cost"`
	TotalCost   float64        `json:"total_cost"`
	Reason      string         `json:"reason"`
	Reference   *string        `json:"reference,omitempty"`
	PerformedBy string         `json:"performed_by"`
	Notes       *string        `json:"notes,omitempty"`
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
}

// Inventory Stats
type InventoryStats struct {
	TotalItems      int     `json:"total_items"`
	StockValue      float64 `json:"stock_value"`
	TotalWarehouses int     `json:"total_warehouses"`
	LowStockCount   int     `json:"low_stock_count"`
	RecentMovements int     `json:"recent_movements"`
}

// Helper function to generate unique ID
func generateID(prefix string) string {
	return fmt.Sprintf("%s-%d-%s", prefix, time.Now().Unix(), 
		fmt.Sprintf("%04d", rand.Intn(10000)))
}

// List Inventory Items
func (h *InventoryHandler) ListInventoryItems(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	category := r.URL.Query().Get("category")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	var query string
	var args []interface{}
	argIndex := 1

	if search != "" || category != "" {
		query = "WHERE 1=1 "
		if search != "" {
			query += fmt.Sprintf("AND (name ILIKE $%d OR sku ILIKE $%d) ", argIndex, argIndex)
			args = append(args, "%"+search+"%")
			argIndex++
		}
		if category != "" && category != "all" {
			query += fmt.Sprintf("AND category = $%d ", argIndex)
			args = append(args, category)
			argIndex++
		}
	}

	rows, err := h.db.Query(fmt.Sprintf(`
		SELECT id, sku, name, category, unit, reorder_point, status, avg_cost, description, suppliers,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM inventory_items %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, query, argIndex, argIndex+1), append(args, limit, offset)...)
	
	if err != nil {
		http.Error(w, "Failed to get inventory items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []InventoryItem
	for rows.Next() {
		var item InventoryItem
		var suppliersJSON []byte
		var description, createdAt, updatedAt sql.NullString

		err := rows.Scan(&item.ID, &item.SKU, &item.Name, &item.Category, &item.Unit, 
			&item.ReorderPoint, &item.Status, &item.AvgCost, &description, &suppliersJSON,
			&createdAt, &updatedAt)
		if err != nil {
			continue
		}

		if description.Valid {
			item.Description = &description.String
		}
		if createdAt.Valid {
			item.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			item.UpdatedAt = updatedAt.String
		}

		json.Unmarshal(suppliersJSON, &item.Suppliers)
		if item.Suppliers == nil {
			item.Suppliers = []string{}
		}

		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

// Get Inventory Item
func (h *InventoryHandler) GetInventoryItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	var item InventoryItem
	var suppliersJSON []byte
	var description, createdAt, updatedAt sql.NullString

	err = h.db.QueryRow(`
		SELECT id, sku, name, category, unit, reorder_point, status, avg_cost, description, suppliers,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM inventory_items WHERE id = $1
	`, id).Scan(&item.ID, &item.SKU, &item.Name, &item.Category, &item.Unit, 
		&item.ReorderPoint, &item.Status, &item.AvgCost, &description, &suppliersJSON,
		&createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Inventory item not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		item.Description = &description.String
	}
	if createdAt.Valid {
		item.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		item.UpdatedAt = updatedAt.String
	}

	json.Unmarshal(suppliersJSON, &item.Suppliers)
	if item.Suppliers == nil {
		item.Suppliers = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

// Create Inventory Item
func (h *InventoryHandler) CreateInventoryItem(w http.ResponseWriter, r *http.Request) {
	var req CreateInventoryItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SKU == "" || req.Name == "" || req.Category == "" || req.Unit == "" {
		http.Error(w, "SKU, name, category, and unit are required", http.StatusBadRequest)
		return
	}

	// Check if SKU already exists
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM inventory_items WHERE sku = $1)", req.SKU).Scan(&exists)
	if err == nil && exists {
		http.Error(w, "SKU already exists", http.StatusBadRequest)
		return
	}

	suppliersJSON, _ := json.Marshal(req.Suppliers)
	if req.Suppliers == nil {
		suppliersJSON = []byte("[]")
	}

	var item InventoryItem
	var suppliersJSONOut []byte
	var description, createdAt, updatedAt sql.NullString

	err = h.db.QueryRow(`
		INSERT INTO inventory_items (sku, name, category, unit, reorder_point, status, avg_cost, description, suppliers)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, sku, name, category, unit, reorder_point, status, avg_cost, description, suppliers,
		          TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		          TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
	`, req.SKU, req.Name, req.Category, req.Unit, req.ReorderPoint, 
		req.Status, req.AvgCost, req.Description, string(suppliersJSON)).Scan(
		&item.ID, &item.SKU, &item.Name, &item.Category, &item.Unit, 
		&item.ReorderPoint, &item.Status, &item.AvgCost, &description, &suppliersJSONOut,
		&createdAt, &updatedAt)

	if err != nil {
		http.Error(w, "Failed to create inventory item", http.StatusInternalServerError)
		return
	}

	if description.Valid {
		item.Description = &description.String
	}
	if createdAt.Valid {
		item.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		item.UpdatedAt = updatedAt.String
	}

	json.Unmarshal(suppliersJSONOut, &item.Suppliers)
	if item.Suppliers == nil {
		item.Suppliers = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

// Update Inventory Item
func (h *InventoryHandler) UpdateInventoryItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	var req UpdateInventoryItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if item exists
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = $1)", id).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Inventory item not found", http.StatusNotFound)
		return
	}

	// Check SKU uniqueness if updating SKU
	if req.SKU != nil && *req.SKU != "" {
		var skuExists bool
		err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM inventory_items WHERE sku = $1 AND id != $2)", *req.SKU, id).Scan(&skuExists)
		if err == nil && skuExists {
			http.Error(w, "SKU already exists", http.StatusBadRequest)
			return
		}
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.SKU != nil {
		updates = append(updates, fmt.Sprintf("sku = $%d", argIndex))
		args = append(args, *req.SKU)
		argIndex++
	}
	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Category != nil {
		updates = append(updates, fmt.Sprintf("category = $%d", argIndex))
		args = append(args, *req.Category)
		argIndex++
	}
	if req.Unit != nil {
		updates = append(updates, fmt.Sprintf("unit = $%d", argIndex))
		args = append(args, *req.Unit)
		argIndex++
	}
	if req.ReorderPoint != nil {
		updates = append(updates, fmt.Sprintf("reorder_point = $%d", argIndex))
		args = append(args, *req.ReorderPoint)
		argIndex++
	}
	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
	}
	if req.AvgCost != nil {
		updates = append(updates, fmt.Sprintf("avg_cost = $%d", argIndex))
		args = append(args, *req.AvgCost)
		argIndex++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.Suppliers != nil {
		suppliersJSON, _ := json.Marshal(*req.Suppliers)
		updates = append(updates, fmt.Sprintf("suppliers = $%d", argIndex))
		args = append(args, string(suppliersJSON))
		argIndex++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, id)

	query := "UPDATE inventory_items SET " + strings.Join(updates, ", ") + " WHERE id = $" + strconv.Itoa(argIndex)

	_, err = h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update inventory item", http.StatusInternalServerError)
		return
	}

	// Return updated item
	h.GetInventoryItem(w, r)
}

// Delete Inventory Item
func (h *InventoryHandler) DeleteInventoryItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM inventory_items WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete inventory item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

