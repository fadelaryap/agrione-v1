package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"strings"
)

// KML structures for parsing
type KML struct {
	XMLName   xml.Name   `xml:"kml"`
	Document  Document   `xml:"Document"`
	Placemark []Placemark `xml:"Placemark"` // Also support root-level Placemarks
}

type Document struct {
	Placemark []Placemark `xml:"Placemark"`
	Folder    []Folder    `xml:"Folder"`
}

type Folder struct {
	Name      string      `xml:"name"`
	Placemark []Placemark `xml:"Placemark"`
	Folder    []Folder    `xml:"Folder"` // Support nested folders
}

type Placemark struct {
	Name          string        `xml:"name"`
	Polygon       Polygon       `xml:"Polygon"`        // Direct polygon
	MultiGeometry MultiGeometry `xml:"MultiGeometry"`  // MultiGeometry containing multiple polygons
}

type MultiGeometry struct {
	Polygon []Polygon `xml:"Polygon"`
}

type Polygon struct {
	OuterBoundaryIs OuterBoundaryIs `xml:"outerBoundaryIs"`
}

type OuterBoundaryIs struct {
	LinearRing LinearRing `xml:"LinearRing"`
}

type LinearRing struct {
	Coordinates string `xml:"coordinates"`
}

// ParsedPolygon represents a parsed polygon from KMZ
type ParsedPolygon struct {
	Name        string      `json:"name"`
	Coordinates [][]float64 `json:"coordinates"` // [[lat, lng], [lat, lng], ...]
}

// ParseKMZ parses a KMZ file and extracts polygons
func ParseKMZ(file multipart.File, size int64) ([]ParsedPolygon, error) {
	// Read the entire file into memory
	data := make([]byte, size)
	_, err := io.ReadFull(file, data)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read KMZ file: %w", err)
	}

	// Open the KMZ file as a ZIP archive
	zipReader, err := zip.NewReader(bytes.NewReader(data), size)
	if err != nil {
		return nil, fmt.Errorf("failed to open KMZ as ZIP: %w", err)
	}

	// Find and read the KML file (usually doc.kml)
	var kmlData []byte
	for _, file := range zipReader.File {
		if strings.HasSuffix(strings.ToLower(file.Name), ".kml") {
			rc, err := file.Open()
			if err != nil {
				continue
			}
			defer rc.Close()

			kmlData, err = io.ReadAll(rc)
			if err != nil {
				return nil, fmt.Errorf("failed to read KML file: %w", err)
			}
			break
		}
	}

	if kmlData == nil {
		return nil, fmt.Errorf("no KML file found in KMZ archive")
	}

	// Parse KML XML
	var kml KML
	if err := xml.Unmarshal(kmlData, &kml); err != nil {
		log.Printf("[KMZ Parser] Failed to parse KML XML: %v", err)
		return nil, fmt.Errorf("failed to parse KML XML: %w", err)
	}

	log.Printf("[KMZ Parser] Parsed KML - Root Placemarks: %d, Document Placemarks: %d, Document Folders: %d",
		len(kml.Placemark), len(kml.Document.Placemark), len(kml.Document.Folder))

	// Collect all placemarks from various sources
	var allPlacemarks []Placemark
	
	// Root level placemarks
	allPlacemarks = append(allPlacemarks, kml.Placemark...)
	
	// Document level placemarks
	allPlacemarks = append(allPlacemarks, kml.Document.Placemark...)
	
	// Placemarks from folders (recursive)
	for _, folder := range kml.Document.Folder {
		allPlacemarks = append(allPlacemarks, extractPlacemarksFromFolder(folder)...)
	}

	log.Printf("[KMZ Parser] Total placemarks found: %d", len(allPlacemarks))

	// Extract polygons
	var polygons []ParsedPolygon
	for i, placemark := range allPlacemarks {
		name := placemark.Name
		if name == "" {
			name = fmt.Sprintf("Field %d", i+1)
		}

		var coords [][]float64
		var foundPolygon bool

		// Check for MultiGeometry first (takes precedence if both exist)
		if len(placemark.MultiGeometry.Polygon) > 0 {
			log.Printf("[KMZ Parser] Placemark %d (%s) has MultiGeometry with %d polygons", i+1, name, len(placemark.MultiGeometry.Polygon))
			
			// Extract the first polygon from MultiGeometry (typically the main one)
			polygon := placemark.MultiGeometry.Polygon[0]
			if polygon.OuterBoundaryIs.LinearRing.Coordinates != "" {
				coords = parseCoordinates(polygon.OuterBoundaryIs.LinearRing.Coordinates)
				foundPolygon = true
				
				if len(placemark.MultiGeometry.Polygon) > 1 {
					log.Printf("[KMZ Parser] Placemark %d (%s) has %d polygons in MultiGeometry, using the first one", i+1, name, len(placemark.MultiGeometry.Polygon))
				}
			}
		} else if placemark.Polygon.OuterBoundaryIs.LinearRing.Coordinates != "" {
			// Check for direct Polygon
			coords = parseCoordinates(placemark.Polygon.OuterBoundaryIs.LinearRing.Coordinates)
			foundPolygon = true
		}

		if !foundPolygon {
			log.Printf("[KMZ Parser] Placemark %d (%s) has no polygon coordinates", i+1, name)
			continue
		}

		if len(coords) < 3 {
			log.Printf("[KMZ Parser] Placemark %d (%s) has less than 3 coordinates: %d", i+1, name, len(coords))
			continue // Need at least 3 points for a polygon
		}

		log.Printf("[KMZ Parser] Extracted polygon: %s with %d coordinates", name, len(coords))
		polygons = append(polygons, ParsedPolygon{
			Name:        name,
			Coordinates: coords,
		})
	}

	log.Printf("[KMZ Parser] Total polygons extracted: %d", len(polygons))
	return polygons, nil
}

// extractPlacemarksFromFolder recursively extracts placemarks from folders
func extractPlacemarksFromFolder(folder Folder) []Placemark {
	var placemarks []Placemark
	
	// Add placemarks from this folder
	placemarks = append(placemarks, folder.Placemark...)
	
	// Recursively extract from nested folders
	for _, nestedFolder := range folder.Folder {
		placemarks = append(placemarks, extractPlacemarksFromFolder(nestedFolder)...)
	}
	
	return placemarks
}

// parseCoordinates parses a coordinate string into [][]float64
// Format: "lon1,lat1,alt1 lon2,lat2,alt2 ..." or "lon1,lat1,alt1\nlon2,lat2,alt2..."
func parseCoordinates(coordStr string) [][]float64 {
	coordStr = strings.TrimSpace(coordStr)
	parts := strings.Fields(coordStr) // Split by whitespace

	var coords [][]float64
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Split by comma
		values := strings.Split(part, ",")
		if len(values) < 2 {
			continue
		}

		var lon, lat float64
		if _, err := fmt.Sscanf(values[0], "%f", &lon); err != nil {
			continue
		}
		if _, err := fmt.Sscanf(values[1], "%f", &lat); err != nil {
			continue
		}

		// Store as [lat, lng] to match our coordinate format
		coords = append(coords, []float64{lat, lon})
	}

	return coords
}
