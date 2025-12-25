package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"agrione/backend/internal/middleware"

	"github.com/gorilla/mux"
)

type UsersHandler struct {
	db *sql.DB
}

func NewUsersHandler(db *sql.DB) *UsersHandler {
	return &UsersHandler{db: db}
}

type UsersListResponse struct {
	Users      []User `json:"users"`
	Total      int    `json:"total"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
	TotalPages int    `json:"total_pages"`
}

type UpdateRoleRequest struct {
	Role string `json:"role"`
}

func (h *UsersHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// Check if filtering by role
	roleFilter := r.URL.Query().Get("role")
	
	// Get pagination parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	// Get total count
	var total int
	var err error
	if roleFilter != "" {
		err = h.db.QueryRow("SELECT COUNT(*) FROM users WHERE role = $1", roleFilter).Scan(&total)
	} else {
		err = h.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&total)
	}
	if err != nil {
		http.Error(w, "Failed to get user count", http.StatusInternalServerError)
		return
	}

	// Get users with pagination
	var rows *sql.Rows
	if roleFilter != "" {
		rows, err = h.db.Query(
			"SELECT id, email, username, first_name, last_name, role, status FROM users WHERE role = $1 ORDER BY id ASC LIMIT $2 OFFSET $3",
			roleFilter, pageSize, offset,
		)
	} else {
		rows, err = h.db.Query(
			"SELECT id, email, username, first_name, last_name, role, status FROM users ORDER BY id ASC LIMIT $1 OFFSET $2",
			pageSize, offset,
		)
	}
	if err != nil {
		http.Error(w, "Failed to get users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(&user.ID, &user.Email, &user.Username, &user.FirstName, &user.LastName, &user.Role, &user.Status)
		if err != nil {
			http.Error(w, "Failed to scan user", http.StatusInternalServerError)
			return
		}
		users = append(users, user)
	}

	totalPages := (total + pageSize - 1) / pageSize

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UsersListResponse{
		Users:      users,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *UsersHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	// Get user ID from mux vars
	vars := mux.Vars(r)
	userIDStr := vars["id"]

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get current user ID from context
	currentUserID := r.Context().Value(middleware.UserIDKey).(int)

	// Prevent user from changing their own role
	if userID == currentUserID {
		http.Error(w, "Cannot change your own role", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate role
	validRoles := map[string]bool{
		"superadmin": true,
		"Level 1":    true,
		"Level 2":    true,
		"Level 3":    true,
		"Level 4":    true,
		"user":       true,
	}
	if !validRoles[req.Role] {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	// Check if user exists
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Update role
	_, err = h.db.Exec("UPDATE users SET role = $1 WHERE id = $2", req.Role, userID)
	if err != nil {
		http.Error(w, "Failed to update role", http.StatusInternalServerError)
		return
	}

	// Get updated user
	var user User
	err = h.db.QueryRow(
		"SELECT id, email, username, first_name, last_name, role, status FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Username, &user.FirstName, &user.LastName, &user.Role, &user.Status)

	if err != nil {
		http.Error(w, "Failed to retrieve updated user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

func (h *UsersHandler) UpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	// Get user ID from mux vars
	vars := mux.Vars(r)
	userIDStr := vars["id"]

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"pending":  true,
		"approved": true,
		"rejected": true,
	}
	if !validStatuses[req.Status] {
		http.Error(w, "Invalid status. Must be 'pending', 'approved', or 'rejected'", http.StatusBadRequest)
		return
	}

	// Check if user exists
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Update status
	_, err = h.db.Exec("UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", req.Status, userID)
	if err != nil {
		http.Error(w, "Failed to update status", http.StatusInternalServerError)
		return
	}

	// Get updated user
	var user User
	err = h.db.QueryRow(
		"SELECT id, email, username, first_name, last_name, role, status FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Username, &user.FirstName, &user.LastName, &user.Role, &user.Status)

	if err != nil {
		http.Error(w, "Failed to retrieve updated user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

