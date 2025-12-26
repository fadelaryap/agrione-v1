package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"agrione/backend/internal/middleware"
)

type NotificationsHandler struct {
	db *sql.DB
}

func NewNotificationsHandler(db *sql.DB) *NotificationsHandler {
	return &NotificationsHandler{db: db}
}

type Notification struct {
	ID        int       `json:"id"`
	Type      string    `json:"type"` // "field_report_pending", "field_report_comment", "work_order_new", "field_report_approved", "field_report_rejected"
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Link      string    `json:"link"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationsResponse struct {
	Notifications []Notification `json:"notifications"`
	UnreadCount   int            `json:"unread_count"`
}

// GetNotifications returns notifications for Level 1/2 users
func (h *NotificationsHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get user role from database
	var userRole string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)
	if err != nil {
		http.Error(w, "Failed to get user role", http.StatusInternalServerError)
		return
	}

	// Only Level 1 and Level 2 can see notifications
	if userRole != "Level 1" && userRole != "Level 2" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(NotificationsResponse{
			Notifications: []Notification{},
			UnreadCount:   0,
		})
		return
	}

	// Get pending field reports count
	var pendingReportsCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM field_reports 
		WHERE status = 'pending'
	`).Scan(&pendingReportsCount)
	if err != nil {
		http.Error(w, "Failed to get pending reports count", http.StatusInternalServerError)
		return
	}

	// Get new work orders (created in last 7 days)
	var newWorkOrdersCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM work_orders 
		WHERE created_at > NOW() - INTERVAL '7 days'
	`).Scan(&newWorkOrdersCount)
	if err != nil {
		http.Error(w, "Failed to get new work orders count", http.StatusInternalServerError)
		return
	}

	// Get unread comments (comments on reports that user hasn't seen)
	// We'll check for comments created in last 24 hours on reports user hasn't approved/rejected yet
	var unreadCommentsCount int
	err = h.db.QueryRow(`
		SELECT COUNT(DISTINCT frc.field_report_id) 
		FROM field_report_comments frc
		INNER JOIN field_reports fr ON fr.id = frc.field_report_id
		WHERE frc.created_at > NOW() - INTERVAL '24 hours'
		AND fr.status = 'pending'
	`).Scan(&unreadCommentsCount)
	if err != nil {
		http.Error(w, "Failed to get unread comments count", http.StatusInternalServerError)
		return
	}

	// Build notifications
	notifications := []Notification{}

	// Pending field reports notification
	if pendingReportsCount > 0 {
		notifications = append(notifications, Notification{
			ID:        1,
			Type:      "field_report_pending",
			Title:     "Laporan Menunggu Persetujuan",
			Message:   fmt.Sprintf("Ada %d laporan yang menunggu persetujuan", pendingReportsCount),
			Link:      "/dashboard/field-reports-approval?filter=pending",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	// New work orders notification
	if newWorkOrdersCount > 0 {
		notifications = append(notifications, Notification{
			ID:        2,
			Type:      "work_order_new",
			Title:     "Work Orders Baru",
			Message:   fmt.Sprintf("Ada %d work order baru dalam 7 hari terakhir", newWorkOrdersCount),
			Link:      "/dashboard/work-orders",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	// Unread comments notification
	if unreadCommentsCount > 0 {
		notifications = append(notifications, Notification{
			ID:        3,
			Type:      "field_report_comment",
			Title:     "Komentar Baru",
			Message:   fmt.Sprintf("Ada komentar baru di %d laporan", unreadCommentsCount),
			Link:      "/dashboard/field-reports-approval",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	// Get recently approved/rejected reports (last 24 hours)
	var recentApprovalsCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM field_reports 
		WHERE (status = 'approved' OR status = 'rejected')
		AND approved_at > NOW() - INTERVAL '24 hours'
	`).Scan(&recentApprovalsCount)
	if err == nil && recentApprovalsCount > 0 {
		notifications = append(notifications, Notification{
			ID:        4,
			Type:      "field_report_processed",
			Title:     "Laporan Diproses",
			Message:   fmt.Sprintf("%d laporan telah diproses dalam 24 jam terakhir", recentApprovalsCount),
			Link:      "/dashboard/field-reports-approval",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	unreadCount := len(notifications)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(NotificationsResponse{
		Notifications: notifications,
		UnreadCount:   unreadCount,
	})
}

