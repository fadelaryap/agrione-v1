package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"agrione/backend/internal/middleware"

	"github.com/gorilla/mux"
)

type AttendanceHandler struct {
	db *sql.DB
}

func NewAttendanceHandler(db *sql.DB) *AttendanceHandler {
	return &AttendanceHandler{db: db}
}

type Attendance struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	Date           string    `json:"date"`
	Session        string    `json:"session"` // "pagi" or "sore"
	SelfieImage    string    `json:"selfie_image"`
	BackCameraImage *string  `json:"back_camera_image,omitempty"`
	HasIssue       bool      `json:"has_issue"`
	Description    *string   `json:"description,omitempty"`
	Latitude       *float64  `json:"latitude,omitempty"`
	Longitude      *float64  `json:"longitude,omitempty"`
	CheckInTime    string    `json:"check_in_time"`
	CheckOutTime   *string   `json:"check_out_time,omitempty"`
	Status         string    `json:"status"`
	Notes          *string   `json:"notes,omitempty"`
	CreatedAt      string    `json:"created_at"`
	UpdatedAt      string    `json:"updated_at"`
}

type CreateAttendanceRequest struct {
	Session         string   `json:"session"` // "pagi" or "sore"
	SelfieImage     string   `json:"selfie_image"` // base64 image
	BackCameraImage *string  `json:"back_camera_image,omitempty"` // base64 image
	HasIssue        bool     `json:"has_issue"`
	Description     *string  `json:"description,omitempty"`
	Latitude        *float64 `json:"latitude,omitempty"`
	Longitude       *float64 `json:"longitude,omitempty"`
	Notes           *string  `json:"notes,omitempty"`
}

type UpdateAttendanceRequest struct {
	CheckOutTime *string `json:"check_out_time,omitempty"`
	Status       *string `json:"status,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

func (h *AttendanceHandler) CreateAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Session != "pagi" && req.Session != "sore" {
		http.Error(w, "Session must be 'pagi' or 'sore'", http.StatusBadRequest)
		return
	}

	if req.SelfieImage == "" {
		http.Error(w, "Selfie image is required", http.StatusBadRequest)
		return
	}

	// Get today's date in GMT+7 (Asia/Jakarta timezone) - must match GetTodayAttendance
	loc, _ := time.LoadLocation("Asia/Jakarta")
	today := time.Now().In(loc).Format("2006-01-02")

	// Check if attendance already exists for this user, date, and session
	var existingID int
	err := h.db.QueryRow(`
		SELECT id FROM attendance 
		WHERE user_id = $1 AND date = $2 AND session = $3
	`, userID, today, req.Session).Scan(&existingID)

	if err == nil {
		// Update existing attendance
		_, err = h.db.Exec(`
			UPDATE attendance 
			SET selfie_image = $1, back_camera_image = $2, has_issue = $3, 
			    description = $4, latitude = $5, longitude = $6,
			    check_in_time = CURRENT_TIMESTAMP, 
			    notes = $7, updated_at = CURRENT_TIMESTAMP
			WHERE id = $8
		`, req.SelfieImage, req.BackCameraImage, req.HasIssue, req.Description, req.Latitude, req.Longitude, req.Notes, existingID)
		if err != nil {
			http.Error(w, "Failed to update attendance", http.StatusInternalServerError)
			return
		}

		// Fetch and return updated attendance
		var att Attendance
		var checkInTime, createdAt, updatedAt sql.NullString
		var checkOutTime, notes sql.NullString

		var backCameraImage sql.NullString
		var description sql.NullString
		var latitude, longitude sql.NullFloat64
		err = h.db.QueryRow(`
			SELECT id, user_id, date, session, selfie_image, back_camera_image, 
			       has_issue, description, latitude, longitude, check_in_time, 
			       check_out_time, status, notes, created_at, updated_at
			FROM attendance WHERE id = $1
		`, existingID).Scan(
			&att.ID, &att.UserID, &att.Date, &att.Session, &att.SelfieImage,
			&backCameraImage, &att.HasIssue, &description, &latitude, &longitude,
			&checkInTime, &checkOutTime, &att.Status, &notes, &createdAt, &updatedAt,
		)
		if err != nil {
			http.Error(w, "Failed to fetch attendance", http.StatusInternalServerError)
			return
		}

		if checkInTime.Valid {
			att.CheckInTime = checkInTime.String
		}
		if checkOutTime.Valid {
			att.CheckOutTime = &checkOutTime.String
		}
		if notes.Valid {
			att.Notes = &notes.String
		}
		if createdAt.Valid {
			att.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			att.UpdatedAt = updatedAt.String
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(att)
		return
	}

	// Create new attendance
	var attendanceID int
	err = h.db.QueryRow(`
		INSERT INTO attendance (user_id, date, session, selfie_image, back_camera_image, has_issue, description, latitude, longitude, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, userID, today, req.Session, req.SelfieImage, req.BackCameraImage, req.HasIssue, req.Description, req.Latitude, req.Longitude, req.Notes).Scan(&attendanceID)

	if err != nil {
		http.Error(w, "Failed to create attendance", http.StatusInternalServerError)
		return
	}

	// Fetch and return created attendance
	var att Attendance
	var checkInTime, createdAt, updatedAt sql.NullString
	var checkOutTime, notes, backCameraImage, description sql.NullString
	var latitude, longitude sql.NullFloat64

	err = h.db.QueryRow(`
		SELECT id, user_id, date, session, selfie_image, back_camera_image, 
		       has_issue, description, latitude, longitude,
		       TO_CHAR(check_in_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_in_time,
		       TO_CHAR(check_out_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_out_time,
		       status, notes, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM attendance WHERE id = $1
	`, attendanceID).Scan(
		&att.ID, &att.UserID, &att.Date, &att.Session, &att.SelfieImage,
		&backCameraImage, &att.HasIssue, &description, &latitude, &longitude,
		&checkInTime, &checkOutTime, &att.Status, &notes, &createdAt, &updatedAt,
	)
	if err != nil {
		http.Error(w, "Failed to fetch attendance", http.StatusInternalServerError)
		return
	}

	if backCameraImage.Valid {
		att.BackCameraImage = &backCameraImage.String
	}
	if description.Valid {
		att.Description = &description.String
	}
	if checkInTime.Valid {
		att.CheckInTime = checkInTime.String
	}
	if checkOutTime.Valid {
		att.CheckOutTime = &checkOutTime.String
	}
	if notes.Valid {
		att.Notes = &notes.String
	}
	if latitude.Valid {
		att.Latitude = &latitude.Float64
	}
	if longitude.Valid {
		att.Longitude = &longitude.Float64
	}
	if createdAt.Valid {
		att.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		att.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(att)
}

func (h *AttendanceHandler) GetTodayAttendance(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get today's date in GMT+7 (Asia/Jakarta timezone)
	loc, _ := time.LoadLocation("Asia/Jakarta")
	today := time.Now().In(loc).Format("2006-01-02")
	
	// Debug logging
	log.Printf("[DEBUG Attendance] GetTodayAttendance - UserID: %d, Today (GMT+7): %s, Server Time: %s", 
		userID, today, time.Now().In(loc).Format("2006-01-02 15:04:05 MST"))

	rows, err := h.db.Query(`
		SELECT id, user_id, date, session, selfie_image, back_camera_image, 
		       has_issue, description, latitude, longitude,
		       TO_CHAR(check_in_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_in_time,
		       TO_CHAR(check_out_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_out_time,
		       status, notes, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM attendance 
		WHERE user_id = $1 AND date = $2
		ORDER BY session
	`, userID, today)

	if err != nil {
		http.Error(w, "Failed to fetch attendance", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var attendances []Attendance
	for rows.Next() {
		var att Attendance
		var checkInTime, createdAt, updatedAt sql.NullString
		var checkOutTime, notes, backCameraImage, description sql.NullString
		var latitude, longitude sql.NullFloat64

		err := rows.Scan(
			&att.ID, &att.UserID, &att.Date, &att.Session, &att.SelfieImage,
			&backCameraImage, &att.HasIssue, &description, &latitude, &longitude,
			&checkInTime, &checkOutTime, &att.Status, &notes, &createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}

		if backCameraImage.Valid {
			att.BackCameraImage = &backCameraImage.String
		}
		if description.Valid {
			att.Description = &description.String
		}
		if checkInTime.Valid {
			att.CheckInTime = checkInTime.String
		}
		if checkOutTime.Valid {
			att.CheckOutTime = &checkOutTime.String
		}
		if notes.Valid {
			att.Notes = &notes.String
		}
		if latitude.Valid {
			att.Latitude = &latitude.Float64
		}
		if longitude.Valid {
			att.Longitude = &longitude.Float64
		}
		if createdAt.Valid {
			att.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			att.UpdatedAt = updatedAt.String
		}

		attendances = append(attendances, att)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attendances)
}

func (h *AttendanceHandler) ListAttendance(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get query parameters
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	query := `
		SELECT id, user_id, date, session, selfie_image, back_camera_image, 
		       has_issue, description, latitude, longitude,
		       TO_CHAR(check_in_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_in_time,
		       TO_CHAR(check_out_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_out_time,
		       status, notes, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM attendance 
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argIndex := 2

	if startDate != "" {
		query += ` AND date >= $` + strconv.Itoa(argIndex)
		args = append(args, startDate)
		argIndex++
	}
	if endDate != "" {
		query += ` AND date <= $` + strconv.Itoa(argIndex)
		args = append(args, endDate)
		argIndex++
	}

	query += ` ORDER BY date DESC, session`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to fetch attendance", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var attendances []Attendance
	for rows.Next() {
		var att Attendance
		var checkInTime, createdAt, updatedAt sql.NullString
		var checkOutTime, notes, backCameraImage, description sql.NullString
		var latitude, longitude sql.NullFloat64

		err := rows.Scan(
			&att.ID, &att.UserID, &att.Date, &att.Session, &att.SelfieImage,
			&backCameraImage, &att.HasIssue, &description, &latitude, &longitude,
			&checkInTime, &checkOutTime, &att.Status, &notes, &createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}

		if backCameraImage.Valid {
			att.BackCameraImage = &backCameraImage.String
		}
		if description.Valid {
			att.Description = &description.String
		}
		if latitude.Valid {
			att.Latitude = &latitude.Float64
		}
		if longitude.Valid {
			att.Longitude = &longitude.Float64
		}
		if checkInTime.Valid {
			att.CheckInTime = checkInTime.String
		}
		if checkOutTime.Valid {
			att.CheckOutTime = &checkOutTime.String
		}
		if notes.Valid {
			att.Notes = &notes.String
		}
		if createdAt.Valid {
			att.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			att.UpdatedAt = updatedAt.String
		}

		attendances = append(attendances, att)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attendances)
}

func (h *AttendanceHandler) GetAttendance(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid attendance ID", http.StatusBadRequest)
		return
	}

	var att Attendance
	var checkInTime, createdAt, updatedAt sql.NullString
	var checkOutTime, notes, backCameraImage, description sql.NullString

	err = h.db.QueryRow(`
		SELECT id, user_id, date, session, selfie_image, back_camera_image, 
		       has_issue, description, 
		       TO_CHAR(check_in_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_in_time,
		       TO_CHAR(check_out_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_out_time,
		       status, notes, 
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM attendance WHERE id = $1
	`, id).Scan(
		&att.ID, &att.UserID, &att.Date, &att.Session, &att.SelfieImage,
		&backCameraImage, &att.HasIssue, &description,
		&checkInTime, &checkOutTime, &att.Status, &notes, &createdAt, &updatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Attendance not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to fetch attendance", http.StatusInternalServerError)
		return
	}

	if backCameraImage.Valid {
		att.BackCameraImage = &backCameraImage.String
	}
	if description.Valid {
		att.Description = &description.String
	}
	if checkInTime.Valid {
		att.CheckInTime = checkInTime.String
	}
	if checkOutTime.Valid {
		att.CheckOutTime = &checkOutTime.String
	}
	if notes.Valid {
		att.Notes = &notes.String
	}
	if createdAt.Valid {
		att.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		att.UpdatedAt = updatedAt.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(att)
}

// ListAllAttendances - Admin endpoint to list all attendances
func (h *AttendanceHandler) ListAllAttendances(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user role - only Level 1 and Level 2 can access this
	// We need to check user role from database
	var userRole string
	err := h.db.QueryRow(`SELECT role FROM users WHERE id = $1`, userID).Scan(&userRole)
	if err != nil {
		http.Error(w, "Failed to verify user", http.StatusInternalServerError)
		return
	}

	if userRole != "Level 1" && userRole != "Level 2" {
		http.Error(w, "Forbidden - Admin access required", http.StatusForbidden)
		return
	}

	// Get query parameters
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	requestedUserId := r.URL.Query().Get("user_id") // Optional: filter by specific user

	query := `
		SELECT a.id, a.user_id, a.date, a.session, a.selfie_image, a.back_camera_image, 
		       a.has_issue, a.description, a.latitude, a.longitude,
		       TO_CHAR(a.check_in_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_in_time,
		       TO_CHAR(a.check_out_time AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as check_out_time,
		       a.status, a.notes, 
		       TO_CHAR(a.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
		       TO_CHAR(a.updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
		FROM attendance a
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	// Filter by user_id if provided
	if requestedUserId != "" {
		userIdInt, err := strconv.Atoi(requestedUserId)
		if err == nil {
			query += ` AND a.user_id = $` + strconv.Itoa(argIndex)
			args = append(args, userIdInt)
			argIndex++
		}
	} else {
		// Only show Level 3 and Level 4 users' attendance
		query += ` AND EXISTS (
			SELECT 1 FROM users u WHERE u.id = a.user_id AND u.role IN ('Level 3', 'Level 4')
		)`
	}

	if startDate != "" {
		query += ` AND a.date >= $` + strconv.Itoa(argIndex)
		args = append(args, startDate)
		argIndex++
	}
	if endDate != "" {
		query += ` AND a.date <= $` + strconv.Itoa(argIndex)
		args = append(args, endDate)
		argIndex++
	}

	query += ` ORDER BY a.date DESC, a.session, a.user_id`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to fetch attendances", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var attendances []Attendance
	for rows.Next() {
		var att Attendance
		var checkInTime, createdAt, updatedAt sql.NullString
		var checkOutTime, notes, backCameraImage, description sql.NullString
		var latitude, longitude sql.NullFloat64

		err := rows.Scan(
			&att.ID, &att.UserID, &att.Date, &att.Session, &att.SelfieImage,
			&backCameraImage, &att.HasIssue, &description, &latitude, &longitude,
			&checkInTime, &checkOutTime, &att.Status, &notes, &createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}

		if backCameraImage.Valid {
			att.BackCameraImage = &backCameraImage.String
		}
		if description.Valid {
			att.Description = &description.String
		}
		if latitude.Valid {
			att.Latitude = &latitude.Float64
		}
		if longitude.Valid {
			att.Longitude = &longitude.Float64
		}
		if checkInTime.Valid {
			att.CheckInTime = checkInTime.String
		}
		if checkOutTime.Valid {
			att.CheckOutTime = &checkOutTime.String
		}
		if notes.Valid {
			att.Notes = &notes.String
		}
		if createdAt.Valid {
			att.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			att.UpdatedAt = updatedAt.String
		}

		attendances = append(attendances, att)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attendances)
}
