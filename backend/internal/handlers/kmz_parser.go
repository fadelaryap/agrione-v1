package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
)

// KML structures for parsing
type KML struct {
	XMLName xml.Name   `xml:"kml"`
	Placemark []Placemark `xml:"Document>Placemark"`
	Placemarks []Placemark `xml:"Placemark"` // Also support root-level Placemarks
}

type Placemark struct {
	Name     string   `xml:"name"`
	Polygon  Polygon  `xml:"Polygon"`
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
		return nil, fmt.Errorf("failed to parse KML XML: %w", err)
	}

	// Combine placemarks from Document and root level
	placemarks := kml.Placemark
	if len(kml.Placemarks) > 0 {
		placemarks = append(placemarks, kml.Placemarks...)
	}

	// Extract polygons
	var polygons []ParsedPolygon
	for i, placemark := range placemarks {
		if placemark.Polygon.OuterBoundaryIs.LinearRing.Coordinates == "" {
			continue
		}

		coords := parseCoordinates(placemark.Polygon.OuterBoundaryIs.LinearRing.Coordinates)
		if len(coords) < 3 {
			continue // Need at least 3 points for a polygon
		}

		// Use name from KML, or generate one if empty
		name := placemark.Name
		if name == "" {
			name = fmt.Sprintf("Field %d", i+1)
		}

		polygons = append(polygons, ParsedPolygon{
			Name:        name,
			Coordinates: coords,
		})
	}

	return polygons, nil
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
