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

	// Build notifications based on user role
	var notifications []Notification
	
	if userRole == "Level 1" || userRole == "Level 2" {
		// Level 1/2 notifications (approval-related)
		notifications = h.getLevel12Notifications()
	} else if userRole == "Level 3" || userRole == "Level 4" {
		// Level 3/4 notifications (field worker notifications)
		notifications = h.getLevel34Notifications(userID)
	} else {
		// Other roles - no notifications
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(NotificationsResponse{
			Notifications: []Notification{},
			UnreadCount:   0,
		})
		return
	}
	
	unreadCount := len(notifications)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(NotificationsResponse{
		Notifications: notifications,
		UnreadCount:   unreadCount,
	})
}

func (h *NotificationsHandler) getLevel12Notifications() []Notification {
	notifications := []Notification{}
	
	// Get pending field reports count
	var pendingReportsCount int
	err := h.db.QueryRow(`
		SELECT COUNT(*) FROM field_reports 
		WHERE status = 'pending'
	`).Scan(&pendingReportsCount)
	if err == nil && pendingReportsCount > 0 {
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

	// Get new work orders (created in last 7 days)
	var newWorkOrdersCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM work_orders 
		WHERE created_at > NOW() - INTERVAL '7 days'
	`).Scan(&newWorkOrdersCount)
	if err == nil && newWorkOrdersCount > 0 {
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

	// Get unread comments
	var unreadCommentsCount int
	err = h.db.QueryRow(`
		SELECT COUNT(DISTINCT frc.field_report_id) 
		FROM field_report_comments frc
		INNER JOIN field_reports fr ON fr.id = frc.field_report_id
		WHERE frc.created_at > NOW() - INTERVAL '24 hours'
		AND fr.status = 'pending'
	`).Scan(&unreadCommentsCount)
	if err == nil && unreadCommentsCount > 0 {
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

	// Get recently processed reports
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

	return notifications
}

func (h *NotificationsHandler) getLevel34Notifications(userID int) []Notification {
	notifications := []Notification{}
	
	// Get user's name for query
	var userName string
	err := h.db.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = $1", userID).Scan(&userName)
	if err != nil {
		return notifications
	}

	// Get approved/rejected reports for this user (last 24 hours)
	var processedReportsCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM field_reports 
		WHERE submitted_by = $1
		AND (status = 'approved' OR status = 'rejected')
		AND approved_at > NOW() - INTERVAL '24 hours'
	`, userName).Scan(&processedReportsCount)
	if err == nil && processedReportsCount > 0 {
		notifications = append(notifications, Notification{
			ID:        1,
			Type:      "field_report_processed",
			Title:     "Laporan Anda Diproses",
			Message:   fmt.Sprintf("%d laporan Anda telah diproses", processedReportsCount),
			Link:      "/lapangan/reports",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	// Get new work orders assigned to this user (last 7 days)
	var newWorkOrdersCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM work_orders 
		WHERE assignee LIKE '%' || $1 || '%'
		AND created_at > NOW() - INTERVAL '7 days'
	`, userName).Scan(&newWorkOrdersCount)
	if err == nil && newWorkOrdersCount > 0 {
		notifications = append(notifications, Notification{
			ID:        2,
			Type:      "work_order_new",
			Title:     "Work Order Baru",
			Message:   fmt.Sprintf("Anda memiliki %d work order baru", newWorkOrdersCount),
			Link:      "/lapangan/work-orders",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	// Get comments on user's reports (last 24 hours)
	var commentsCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) FROM field_report_comments frc
		INNER JOIN field_reports fr ON fr.id = frc.field_report_id
		WHERE fr.submitted_by = $1
		AND frc.created_at > NOW() - INTERVAL '24 hours'
	`, userName).Scan(&commentsCount)
	if err == nil && commentsCount > 0 {
		notifications = append(notifications, Notification{
			ID:        3,
			Type:      "field_report_comment",
			Title:     "Komentar di Laporan Anda",
			Message:   fmt.Sprintf("Ada %d komentar baru di laporan Anda", commentsCount),
			Link:      "/lapangan/reports",
			Read:      false,
			CreatedAt: time.Now(),
		})
	}

	return notifications
}

