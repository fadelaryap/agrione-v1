package middleware

import (
	"net/http"

	"agrione/backend/internal/config"
)

func CORSMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get origin from request
			origin := r.Header.Get("Origin")
			
			// Determine allowed origin
			allowedOrigin := cfg.CORSOrigin
			
			// Support IP addresses and wildcard
			if cfg.CORSOrigin == "*" || cfg.CORSOrigin == "" {
				// If wildcard or empty, use request origin (for IP-based access)
				if origin != "" {
					allowedOrigin = origin
				} else {
					allowedOrigin = "*"
				}
			} else {
				// Use configured CORS origin (supports IP addresses like http://123.456.789.0:3000)
				allowedOrigin = cfg.CORSOrigin
			}
			
			// Set CORS headers
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Expose-Headers", "X-CSRF-Token")

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}




