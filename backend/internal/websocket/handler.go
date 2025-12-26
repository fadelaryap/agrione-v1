package websocket

import (
	"database/sql"
	"log"
	"net/http"

	"agrione/backend/internal/config"
	"agrione/backend/internal/middleware"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin (adjust for production)
		return true
	},
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(hub *Hub, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Authenticate user
		userID, ok := r.Context().Value(middleware.UserIDKey).(int)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Upgrade connection to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}

		// Create client
		client := &Client{
			hub:    hub,
			conn:   conn,
			userID: userID,
			send:   make(chan []byte, 256),
		}

		// Register client
		hub.register <- client

		// Start goroutines
		go client.writePump()
		go client.readPump()
	}
}

// CreateNotification creates a notification in the database and sends it via WebSocket
func CreateNotification(db *sql.DB, hub *Hub, userID int, notificationType, title, message, link string) error {
	// Insert notification into database
	var notificationID int
	err := db.QueryRow(`
		INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
		VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
		RETURNING id
	`, userID, notificationType, title, message, link).Scan(&notificationID)
	if err != nil {
		return err
	}

	// Fetch the created notification
	var notification struct {
		ID        int    `json:"id"`
		UserID    int    `json:"user_id"`
		Type      string `json:"type"`
		Title     string `json:"title"`
		Message   string `json:"message"`
		Link      string `json:"link"`
		Read      bool   `json:"read"`
		CreatedAt string `json:"created_at"`
	}

	err = db.QueryRow(`
		SELECT id, user_id, type, title, message, link, read, created_at::text
		FROM notifications
		WHERE id = $1
	`, notificationID).Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Type,
		&notification.Title,
		&notification.Message,
		&notification.Link,
		&notification.Read,
		&notification.CreatedAt,
	)
	if err != nil {
		return err
	}

	// Send via WebSocket to the specific user
	messageData := NotificationMessage{
		Type: "new_notification",
		Data: notification,
	}

	return hub.SendToUser(userID, messageData)
}

// GetUserIDFromSubmittedBy gets user ID from submitted_by name
func GetUserIDFromSubmittedBy(db *sql.DB, submittedBy string) (int, error) {
	var userID int
	// Try to match by full name (first_name + ' ' + last_name)
	err := db.QueryRow(`
		SELECT id FROM users 
		WHERE first_name || ' ' || last_name = $1
		LIMIT 1
	`, submittedBy).Scan(&userID)
	return userID, err
}

// GetUserIDsByRole gets all user IDs with a specific role
func GetUserIDsByRole(db *sql.DB, role string) ([]int, error) {
	rows, err := db.Query("SELECT id FROM users WHERE role = $1", role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		userIDs = append(userIDs, userID)
	}
	return userIDs, nil
}

