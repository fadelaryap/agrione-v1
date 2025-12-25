package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/csrf"
)

type HealthResponse struct {
	Status string `json:"status"`
}

type CSRFTokenResponse struct {
	Token string `json:"token"`
}

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(HealthResponse{
		Status: "ok",
	})
}

func GetCSRFToken(w http.ResponseWriter, r *http.Request) {
	token := csrf.Token(r)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-CSRF-Token", token)
	json.NewEncoder(w).Encode(CSRFTokenResponse{
		Token: token,
	})
}

