// Area calculation utilities

export function calculateArea(drawType: string, coordinates: any): number {
  if (!coordinates) return 0

  if (drawType === 'circle') {
    // Circle: { center: [lat, lng], radius: number }
    const radius = coordinates.radius || 0
    // Convert radius from meters to hectares (1 hectare = 10,000 m²)
    const areaInM2 = Math.PI * radius * radius
    return areaInM2 / 10000 // Convert to hectares
  } else if (drawType === 'rectangle' || drawType === 'polygon') {
    // Polygon/Rectangle: [[lat, lng], [lat, lng], ...]
    if (!Array.isArray(coordinates) || coordinates.length < 3) return 0
    
    // Calculate area using spherical excess formula (Shoelace formula for lat/lng)
    let area = 0
    const n = coordinates.length
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const xi = coordinates[i][1] // longitude
      const yi = coordinates[i][0] // latitude
      const xj = coordinates[j][1]
      const yj = coordinates[j][0]
      
      area += xi * yj - xj * yi
    }
    
    area = Math.abs(area) / 2
    
    // Convert to hectares (approximate, using Earth's radius)
    // This is a simplified calculation - for production, use proper geodetic calculations
    const R = 6371000 // Earth radius in meters
    const areaInM2 = area * R * R * Math.PI / 180 * Math.PI / 180
    return areaInM2 / 10000 // Convert to hectares
  }
  
  return 0
}

export function formatArea(area: number): string {
  if (area < 0.01) {
    return `${(area * 10000).toFixed(0)} m²`
  } else {
    return `${area.toFixed(2)} ha`
  }
}

export function debugAreaCalculation(drawType: string, coordinates: any) {
  const area = calculateArea(drawType, coordinates)
  console.log(`Area calculation for ${drawType}:`, {
    coordinates,
    area: formatArea(area),
    rawArea: area
  })
}


