package main

import (
	"log"
	"net/http"
	"os"

	"agrione/backend/internal/config"
	"agrione/backend/internal/database"
	"agrione/backend/internal/handlers"
	"agrione/backend/internal/middleware"
	"agrione/backend/internal/websocket"

	"github.com/gorilla/csrf"
	"github.com/gorilla/mux"
)

func main() {
	// Load configuration
	cfg := config.Load()
	
	// Log database configuration (without password)
	log.Printf("Database config: host=%s, port=%s, user=%s, dbname=%s", 
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBName)

	// Initialize database
	db, err := database.Init(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	testHandler := handlers.NewTestHandler(db)
	usersHandler := handlers.NewUsersHandler(db)
	fieldsHandler := handlers.NewFieldsHandler(db)
	plotsHandler := handlers.NewPlotsHandler(db)
	plantTypesHandler := handlers.NewPlantTypesHandler(db)
	workOrdersHandler := handlers.NewWorkOrdersHandler(db, hub)
	fieldReportsHandler := handlers.NewFieldReportsHandler(db, hub)
	attendanceHandler := handlers.NewAttendanceHandler(db)
	notificationsHandler := handlers.NewNotificationsHandler(db, hub)
	cultivationSeasonsHandler := handlers.NewCultivationSeasonsHandler(db)
	inventoryHandler := handlers.NewInventoryHandler(db)

	// Setup router
	r := mux.NewRouter()

	// Apply CORS middleware first
	r.Use(middleware.CORSMiddleware(cfg))

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	
	// Handle OPTIONS for all API routes (must be before CSRF)
	api.PathPrefix("").Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	
	// Public routes (no CSRF for GET)
	api.HandleFunc("/health", handlers.HealthCheck).Methods("GET")
	api.HandleFunc("/user", testHandler.TestConnection).Methods("GET")

	// Setup CSRF protection (only validates POST/PUT/DELETE, GET is exempt)
	// Support IP addresses in trusted origins
	trustedOrigins := []string{}
	if cfg.CORSOrigin != "" && cfg.CORSOrigin != "*" {
		trustedOrigins = []string{cfg.CORSOrigin}
	}
	// If CORS_ORIGIN is "*" or empty, CSRF will be more permissive
	// This allows IP-based access without strict origin checking
	
	csrfMiddleware := csrf.Protect(
		[]byte(cfg.CSRFSecret),
		csrf.Secure(false), // Set to false for HTTP (IP-based access without HTTPS)
		csrf.Path("/"),
		csrf.TrustedOrigins(trustedOrigins),
		csrf.ErrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Log for debugging
			log.Printf("CSRF validation failed. Origin: %s, Expected: %s", r.Header.Get("Origin"), cfg.CORSOrigin)
			http.Error(w, "CSRF token validation failed", http.StatusForbidden)
		})),
	)

	// CSRF endpoint needs CSRF middleware to set cookie, but GET is exempt
	apiWithCSRFForCookie := api.PathPrefix("").Subrouter()
	apiWithCSRFForCookie.Use(csrfMiddleware)
	apiWithCSRFForCookie.HandleFunc("/csrf", handlers.GetCSRFToken).Methods("GET")

	// CSRF middleware that skips OPTIONS requests
	csrfSkipOptions := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == "OPTIONS" {
				next.ServeHTTP(w, r)
				return
			}
			csrfMiddleware(next).ServeHTTP(w, r)
		})
	}

	// POST routes with CSRF protection
	apiWithCSRF := api.PathPrefix("").Subrouter()
	apiWithCSRF.Use(csrfSkipOptions)
	apiWithCSRF.HandleFunc("/signup", authHandler.Signup).Methods("POST")
	apiWithCSRF.HandleFunc("/login", authHandler.Login).Methods("POST")

	// Protected routes
	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.AuthMiddleware(cfg))
	protected.HandleFunc("/profile", authHandler.Profile).Methods("GET")
	protected.HandleFunc("/users", usersHandler.ListUsers).Methods("GET")
	protected.HandleFunc("/fields", fieldsHandler.ListFields).Methods("GET")
	protected.HandleFunc("/fields/{id}", fieldsHandler.GetField).Methods("GET")
	protected.HandleFunc("/plots", plotsHandler.ListPlots).Methods("GET")
	protected.HandleFunc("/plots/{id}", plotsHandler.GetPlot).Methods("GET")
	protected.HandleFunc("/plant-types", plantTypesHandler.ListPlantTypes).Methods("GET")
	protected.HandleFunc("/plant-types/{id}", plantTypesHandler.GetPlantType).Methods("GET")
	protected.HandleFunc("/work-orders", workOrdersHandler.ListWorkOrders).Methods("GET")
	protected.HandleFunc("/work-orders/{id}", workOrdersHandler.GetWorkOrder).Methods("GET")
	protected.HandleFunc("/cultivation-seasons", cultivationSeasonsHandler.ListCultivationSeasons).Methods("GET")
	protected.HandleFunc("/cultivation-seasons/{id}", cultivationSeasonsHandler.GetCultivationSeason).Methods("GET")
	
	// Inventory routes (GET)
	protected.HandleFunc("/inventory/stats", inventoryHandler.GetInventoryStats).Methods("GET")
	protected.HandleFunc("/inventory/items", inventoryHandler.ListInventoryItems).Methods("GET")
	protected.HandleFunc("/inventory/items/{id}", inventoryHandler.GetInventoryItem).Methods("GET")
	protected.HandleFunc("/inventory/stock-lots", inventoryHandler.ListStockLots).Methods("GET")
	protected.HandleFunc("/inventory/warehouses", inventoryHandler.ListWarehouses).Methods("GET")
	protected.HandleFunc("/inventory/stock-movements", inventoryHandler.ListStockMovements).Methods("GET")
	
	// Protected POST routes (require both auth and CSRF)
	protectedPost := api.PathPrefix("").Subrouter()
	protectedPost.Use(csrfSkipOptions)
	protectedPost.Use(middleware.AuthMiddleware(cfg))
	protectedPost.HandleFunc("/logout", authHandler.Logout).Methods("POST")
	protectedPost.HandleFunc("/fields", fieldsHandler.CreateField).Methods("POST")
	protectedPost.HandleFunc("/plots", plotsHandler.CreatePlot).Methods("POST")
	protectedPost.HandleFunc("/plant-types", plantTypesHandler.CreatePlantType).Methods("POST")
	protectedPost.HandleFunc("/work-orders", workOrdersHandler.CreateWorkOrder).Methods("POST")
	protectedPost.HandleFunc("/cultivation-seasons", cultivationSeasonsHandler.CreateCultivationSeason).Methods("POST")
	protectedPost.HandleFunc("/inventory/items", inventoryHandler.CreateInventoryItem).Methods("POST")
	protectedPost.HandleFunc("/inventory/stock-lots", inventoryHandler.CreateStockLot).Methods("POST")
	protectedPost.HandleFunc("/inventory/stock-lots/remove", inventoryHandler.RemoveStock).Methods("POST")
	
	// Protected PUT routes (require both auth and CSRF)
	protectedPut := api.PathPrefix("").Subrouter()
	protectedPut.Use(csrfSkipOptions)
	protectedPut.Use(middleware.AuthMiddleware(cfg))
	protectedPut.HandleFunc("/users/{id}/role", usersHandler.UpdateUserRole).Methods("PUT")
	protectedPut.HandleFunc("/users/{id}/status", usersHandler.UpdateUserStatus).Methods("PUT")
	protectedPut.HandleFunc("/fields/{id}", fieldsHandler.UpdateField).Methods("PUT")
	protectedPut.HandleFunc("/fields/{id}/assign", fieldsHandler.AssignFieldToUser).Methods("PUT")
	protectedPut.HandleFunc("/plots/{id}", plotsHandler.UpdatePlot).Methods("PUT")
	protectedPut.HandleFunc("/plant-types/{id}", plantTypesHandler.UpdatePlantType).Methods("PUT")
	protectedPut.HandleFunc("/work-orders/{id}", workOrdersHandler.UpdateWorkOrder).Methods("PUT")
	protectedPut.HandleFunc("/cultivation-seasons/{id}", cultivationSeasonsHandler.UpdateCultivationSeason).Methods("PUT")
	protectedPut.HandleFunc("/inventory/items/{id}", inventoryHandler.UpdateInventoryItem).Methods("PUT")
	
	// Protected DELETE routes (require both auth and CSRF)
	protectedDelete := api.PathPrefix("").Subrouter()
	protectedDelete.Use(csrfSkipOptions)
	protectedDelete.Use(middleware.AuthMiddleware(cfg))
	protectedDelete.HandleFunc("/fields/{id}", fieldsHandler.DeleteField).Methods("DELETE")
	protectedDelete.HandleFunc("/plots/{id}", plotsHandler.DeletePlot).Methods("DELETE")
	protectedDelete.HandleFunc("/plant-types/{id}", plantTypesHandler.DeletePlantType).Methods("DELETE")
	protectedDelete.HandleFunc("/work-orders/{id}", workOrdersHandler.DeleteWorkOrder).Methods("DELETE")
	protectedDelete.HandleFunc("/cultivation-seasons/{id}", cultivationSeasonsHandler.DeleteCultivationSeason).Methods("DELETE")
	protectedDelete.HandleFunc("/inventory/items/{id}", inventoryHandler.DeleteInventoryItem).Methods("DELETE")

	// Field Reports routes
	protected.HandleFunc("/field-reports", fieldReportsHandler.ListFieldReports).Methods("GET")
	protected.HandleFunc("/field-reports/{id}", fieldReportsHandler.GetFieldReport).Methods("GET")
	protectedPost.HandleFunc("/field-reports", fieldReportsHandler.CreateFieldReport).Methods("POST")
	protectedPut.HandleFunc("/field-reports/{id}", fieldReportsHandler.UpdateFieldReport).Methods("PUT")
	protectedDelete.HandleFunc("/field-reports/{id}", fieldReportsHandler.DeleteFieldReport).Methods("DELETE")
	protectedPost.HandleFunc("/field-reports/{id}/comments", fieldReportsHandler.AddComment).Methods("POST")
	protectedPost.HandleFunc("/field-reports/{id}/approve", fieldReportsHandler.ApproveFieldReport).Methods("POST")
	protectedPost.HandleFunc("/field-reports/{id}/reject", fieldReportsHandler.RejectFieldReport).Methods("POST")
	
	// Attendance routes
	protected.HandleFunc("/attendance/today", attendanceHandler.GetTodayAttendance).Methods("GET")
	protected.HandleFunc("/attendance/stats", attendanceHandler.GetAttendanceStats).Methods("GET")
	protected.HandleFunc("/attendance/all", attendanceHandler.ListAllAttendances).Methods("GET")
	protected.HandleFunc("/attendance", attendanceHandler.ListAttendance).Methods("GET")
	protected.HandleFunc("/attendance/{id}", attendanceHandler.GetAttendance).Methods("GET")
	protectedPost.HandleFunc("/attendance", attendanceHandler.CreateAttendance).Methods("POST")
	
	// Notifications routes
	protected.HandleFunc("/notifications", notificationsHandler.GetNotifications).Methods("GET")
	protectedPut.HandleFunc("/notifications/{id}/read", notificationsHandler.MarkAsRead).Methods("PUT")
	protectedPut.HandleFunc("/notifications/read-all", notificationsHandler.MarkAllAsRead).Methods("PUT")
	
	// WebSocket route (handles authentication internally via query param or header)
	// Not using protected router because WebSocket needs to handle auth differently
	api.HandleFunc("/ws", websocket.HandleWebSocket(hub, cfg)).Methods("GET")

	// Wrap router
	http.Handle("/", r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

