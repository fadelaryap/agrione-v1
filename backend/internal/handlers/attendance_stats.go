package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// AttendanceStats represents attendance statistics
type AttendanceStats struct {
	TotalUsers        int            `json:"total_users"`
	TotalAttendance   int            `json:"total_attendance"`
	TodayAttendance   int            `json:"today_attendance"`
	ThisWeekAttendance int           `json:"this_week_attendance"`
	ThisMonthAttendance int          `json:"this_month_attendance"`
	AttendanceByUser  []UserAttendanceStats `json:"attendance_by_user"`
}

type UserAttendanceStats struct {
	UserID           int    `json:"user_id"`
	UserName         string `json:"user_name"`
	UserEmail        string `json:"user_email"`
	UserRole         string `json:"user_role"`
	TotalAttendance  int    `json:"total_attendance"`
	TodayAttendance  int    `json:"today_attendance"`
	ThisWeekAttendance int  `json:"this_week_attendance"`
	ThisMonthAttendance int `json:"this_month_attendance"`
	AssignedFields   []FieldInfo `json:"assigned_fields"`
}

type FieldInfo struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

func (h *AttendanceHandler) GetAttendanceStats(w http.ResponseWriter, r *http.Request) {
	// Get today's date in GMT+7
	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)
	today := now.Format("2006-01-02")
	weekStart := now.AddDate(0, 0, -int(now.Weekday())).Format("2006-01-02")
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc).Format("2006-01-02")
	
	log.Printf("[DEBUG Attendance Stats] Today: %s, Week Start: %s, Month Start: %s", today, weekStart, monthStart)
	
	// Get Level 3 and 4 users
	rows, err := h.db.Query(`
		SELECT id, email, first_name, last_name, role
		FROM users
		WHERE role IN ('Level 3', 'Level 4') AND status = 'approved'
		ORDER BY first_name, last_name
	`)
	if err != nil {
		http.Error(w, "Failed to get users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	
	var users []struct {
		ID        int
		Email     string
		FirstName string
		LastName  string
		Role      string
	}
	
	for rows.Next() {
		var u struct {
			ID        int
			Email     string
			FirstName string
			LastName  string
			Role      string
		}
		if err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Role); err != nil {
			continue
		}
		users = append(users, u)
	}
	
	// Get attendance stats for each user
	var stats AttendanceStats
	stats.TotalUsers = len(users)
	stats.AttendanceByUser = make([]UserAttendanceStats, 0, len(users))
	
	for _, user := range users {
		userStats := UserAttendanceStats{
			UserID:   user.ID,
			UserName: user.FirstName + " " + user.LastName,
			UserEmail: user.Email,
			UserRole: user.Role,
		}
		
		// Get total attendance
		err := h.db.QueryRow(`
			SELECT COUNT(*) FROM attendance WHERE user_id = $1
		`, user.ID).Scan(&userStats.TotalAttendance)
		if err != nil {
			log.Printf("Error getting total attendance for user %d: %v", user.ID, err)
		}
		
		// Get today's attendance
		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM attendance WHERE user_id = $1 AND date = $2
		`, user.ID, today).Scan(&userStats.TodayAttendance)
		if err != nil {
			log.Printf("Error getting today attendance for user %d: %v", user.ID, err)
		}
		
		// Get this week's attendance
		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM attendance 
			WHERE user_id = $1 AND date >= $2 AND date <= $3
		`, user.ID, weekStart, today).Scan(&userStats.ThisWeekAttendance)
		if err != nil {
			log.Printf("Error getting week attendance for user %d: %v", user.ID, err)
		}
		
		// Get this month's attendance
		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM attendance 
			WHERE user_id = $1 AND date >= $2 AND date <= $3
		`, user.ID, monthStart, today).Scan(&userStats.ThisMonthAttendance)
		if err != nil {
			log.Printf("Error getting month attendance for user %d: %v", user.ID, err)
		}
		
		// Get assigned fields
		fieldRows, err := h.db.Query(`
			SELECT id, name FROM fields WHERE user_id = $1
		`, user.ID)
		if err == nil {
			defer fieldRows.Close()
			for fieldRows.Next() {
				var field FieldInfo
				if err := fieldRows.Scan(&field.ID, &field.Name); err == nil {
					userStats.AssignedFields = append(userStats.AssignedFields, field)
				}
			}
		}
		
		stats.AttendanceByUser = append(stats.AttendanceByUser, userStats)
		stats.TotalAttendance += userStats.TotalAttendance
		stats.TodayAttendance += userStats.TodayAttendance
		stats.ThisWeekAttendance += userStats.ThisWeekAttendance
		stats.ThisMonthAttendance += userStats.ThisMonthAttendance
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

