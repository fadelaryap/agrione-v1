package config

import (
	"os"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	CSRFSecret string
	CORSOrigin string
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "agrione"),
		DBPassword: getEnv("DB_PASSWORD", "agrione123"),
		DBName:     getEnv("DB_NAME", "agrione_db"),
		JWTSecret:  getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		CSRFSecret: getEnv("CSRF_SECRET", "your-csrf-secret-key-change-in-production"),
		CORSOrigin: getEnv("CORS_ORIGIN", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}




