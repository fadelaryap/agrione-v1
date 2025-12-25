package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

type GCSClient struct {
	client     *storage.Client
	bucketName string
}

func NewGCSClient(bucketName string, credentialsPath string) (*GCSClient, error) {
	ctx := context.Background()
	
	var client *storage.Client
	var err error
	
	if credentialsPath != "" {
		// Use credentials file path
		if _, err := os.Stat(credentialsPath); os.IsNotExist(err) {
			return nil, fmt.Errorf("credentials file not found: %s", credentialsPath)
		}
		client, err = storage.NewClient(ctx, option.WithCredentialsFile(credentialsPath))
	} else {
		// Use default credentials (for GCP environment or GOOGLE_APPLICATION_CREDENTIALS env var)
		client, err = storage.NewClient(ctx)
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}
	
	return &GCSClient{
		client:     client,
		bucketName: bucketName,
	}, nil
}

func (g *GCSClient) UploadFile(ctx context.Context, fileData []byte, fileName string, contentType string) (string, error) {
	// Generate unique filename with timestamp
	timestamp := time.Now().Unix()
	objectName := fmt.Sprintf("%s/%d_%s", time.Now().Format("2006/01/02"), timestamp, fileName)
	
	obj := g.client.Bucket(g.bucketName).Object(objectName)
	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType
	
	// Set public read access (optional, adjust based on your needs)
	writer.ACL = []storage.ACLRule{{Entity: storage.AllUsers, Role: storage.RoleReader}}
	
	if _, err := writer.Write(fileData); err != nil {
		writer.Close()
		return "", fmt.Errorf("failed to write to GCS: %w", err)
	}
	
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close GCS writer: %w", err)
	}
	
	// Return public URL
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", g.bucketName, objectName)
	return url, nil
}

// GenerateSignedURL generates a signed URL for direct upload from frontend
func (g *GCSClient) GenerateSignedURL(ctx context.Context, fileName string, contentType string, expiresIn time.Duration) (string, string, error) {
	// Generate unique filename with timestamp
	timestamp := time.Now().Unix()
	objectName := fmt.Sprintf("%s/%d_%s", time.Now().Format("2006/01/02"), timestamp, fileName)
	
	opts := &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "PUT",
		Expires: time.Now().Add(expiresIn),
		Headers: []string{
			fmt.Sprintf("Content-Type:%s", contentType),
		},
	}
	
	url, err := g.client.Bucket(g.bucketName).SignedURL(objectName, opts)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate signed URL: %w", err)
	}
	
	// Return both signed URL and object name (for storing in DB)
	return url, objectName, nil
}

// GetPublicURL returns the public URL for an object
func (g *GCSClient) GetPublicURL(objectName string) string {
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", g.bucketName, objectName)
}

func (g *GCSClient) DeleteFile(ctx context.Context, objectName string) error {
	obj := g.client.Bucket(g.bucketName).Object(objectName)
	return obj.Delete(ctx)
}

func (g *GCSClient) Close() error {
	return g.client.Close()
}

