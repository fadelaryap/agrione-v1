package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"agrione/backend/internal/middleware"
	"agrione/backend/internal/websocket"

	"github.com/gorilla/mux"
)

type NotificationsHandler struct {
	db  *sql.DB
	hub *websocket.Hub
}

func NewNotificationsHandler(db *sql.DB, hub *websocket.Hub) *NotificationsHandler {
	return &NotificationsHandler{db: db, hub: hub}
}

type Notification struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Link      string `json:"link"`
	Read      bool   `json:"read"`
	CreatedAt string `json:"created_at"`
}

type NotificationsResponse struct {
	Notifications []Notification `json:"notifications"`
	UnreadCount   int            `json:"unread_count"`
}

// GetNotifications returns all notifications for the current user
func (h *NotificationsHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get query parameters
	query := r.URL.Query()
	unreadOnly := query.Get("unread_only") == "true"
	limitStr := query.Get("limit")
	limit := 50 // default
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Build query
	var rows *sql.Rows
	var err error
	if unreadOnly {
		rows, err = h.db.Query(`
			SELECT id, user_id, type, title, message, link, read, created_at::text
			FROM notifications
			WHERE user_id = $1 AND read = FALSE
			ORDER BY created_at DESC
			LIMIT $2
		`, userID, limit)
	} else {
		rows, err = h.db.Query(`
			SELECT id, user_id, type, title, message, link, read, created_at::text
			FROM notifications
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT $2
		`, userID, limit)
	}

	if err != nil {
		http.Error(w, "Failed to get notifications", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var n Notification
		err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.Type,
			&n.Title,
			&n.Message,
			&n.Link,
			&n.Read,
			&n.CreatedAt,
		)
		if err != nil {
			continue
		}
		notifications = append(notifications, n)
	}

	// Get unread count
	var unreadCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM notifications
		WHERE user_id = $1 AND read = FALSE
	`, userID).Scan(&unreadCount)
	if err != nil {
		unreadCount = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(NotificationsResponse{
		Notifications: notifications,
		UnreadCount:   unreadCount,
	})
}

// MarkAsRead marks a notification as read
func (h *NotificationsHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	notificationIDStr := vars["id"]
	notificationID, err := strconv.Atoi(notificationIDStr)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	// Update notification (only if it belongs to the user)
	result, err := h.db.Exec(`
		UPDATE notifications
		SET read = TRUE, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND user_id = $2
	`, notificationID, userID)
	if err != nil {
		http.Error(w, "Failed to update notification", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, "Failed to check update result", http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "Notification not found or access denied", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Notification marked as read"})
}

// MarkAllAsRead marks all notifications as read for the current user
func (h *NotificationsHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	_, err := h.db.Exec(`
		UPDATE notifications
		SET read = TRUE, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND read = FALSE
	`, userID)
	if err != nil {
		http.Error(w, "Failed to update notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "All notifications marked as read"})
}
