// Geometry utilities for field/plot detection

export interface Field {
  id: number
  coordinates: any
  draw_type: string
  name?: string
}

// Check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [lat, lng] = point
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

// Check if a point is inside a circle
function isPointInCircle(point: [number, number], center: [number, number], radius: number): boolean {
  const R = 6371000 // Earth radius in meters
  const dLat = (point[0] - center[0]) * Math.PI / 180
  const dLng = (point[1] - center[1]) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(center[0] * Math.PI / 180) * Math.cos(point[0] * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance <= radius
}

// Find field that contains a point
export function findContainingField(point: [number, number], fields: Field[]): Field | null {
  for (const field of fields) {
    if (field.draw_type === 'circle') {
      if (field.coordinates?.center && field.coordinates?.radius) {
        const center: [number, number] = field.coordinates.center
        if (isPointInCircle(point, center, field.coordinates.radius)) {
          return field
        }
      }
    } else if (Array.isArray(field.coordinates)) {
      if (isPointInPolygon(point, field.coordinates)) {
        return field
      }
    }
  }
  return null
}

// Find all fields that contain a point
export function findAllContainingFields(point: [number, number], fields: Field[]): Field[] {
  return fields.filter(field => {
    if (field.draw_type === 'circle') {
      if (field.coordinates?.center && field.coordinates?.radius) {
        const center: [number, number] = field.coordinates.center
        return isPointInCircle(point, center, field.coordinates.radius)
      }
    } else if (Array.isArray(field.coordinates)) {
      return isPointInPolygon(point, field.coordinates)
    }
    return false
  })
}

// Find nearest field to a point
export function findNearestField(point: [number, number], fields: Field[]): Field | null {
  if (fields.length === 0) return null
  
  let nearest: Field | null = null
  let minDistance = Infinity
  
  for (const field of fields) {
    let distance = Infinity
    
    if (field.draw_type === 'circle' && field.coordinates?.center) {
      const center: [number, number] = field.coordinates.center
      const R = 6371000
      const dLat = (point[0] - center[0]) * Math.PI / 180
      const dLng = (point[1] - center[1]) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(center[0] * Math.PI / 180) * Math.cos(point[0] * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      distance = R * c
    } else if (Array.isArray(field.coordinates) && field.coordinates.length > 0) {
      // Calculate distance to first point of polygon
      const firstPoint = field.coordinates[0]
      const R = 6371000
      const dLat = (point[0] - firstPoint[0]) * Math.PI / 180
      const dLng = (point[1] - firstPoint[1]) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(firstPoint[0] * Math.PI / 180) * Math.cos(point[0] * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      distance = R * c
    }
    
    if (distance < minDistance) {
      minDistance = distance
      nearest = field
    }
  }
  
  return nearest
}

