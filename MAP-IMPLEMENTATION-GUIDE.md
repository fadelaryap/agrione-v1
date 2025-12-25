# Map Implementation Guide

## Status Implementasi

### ✅ Backend (Selesai)
1. **Fields API** - `/api/fields`
   - `GET /api/fields` - List semua fields (bisa filter dengan `?user_id=X`)
   - `GET /api/fields/{id}` - Get field by ID
   - `POST /api/fields` - Create field baru
   - `PUT /api/fields/{id}` - Update field
   - `PUT /api/fields/{id}/assign` - Assign field ke user Level 3/4
   - `DELETE /api/fields/{id}` - Delete field

2. **Plots API** - `/api/plots`
   - `GET /api/plots` - List semua plots
   - `GET /api/plots/{id}` - Get plot by ID
   - `POST /api/plots` - Create plot baru
   - `PUT /api/plots/{id}` - Update plot
   - `DELETE /api/plots/{id}` - Delete plot

3. **Plant Types API** - `/api/plant-types`
   - `GET /api/plant-types` - List semua plant types
   - `GET /api/plant-types/{id}` - Get plant type by ID
   - `POST /api/plant-types` - Create plant type baru
   - `PUT /api/plant-types/{id}` - Update plant type
   - `DELETE /api/plant-types/{id}` - Delete plant type

4. **Users API** - Updated
   - `GET /api/users?role=Level 3` - Filter users by role

### ✅ Database (Selesai)
- Tabel `fields` sudah ada dengan kolom `user_id` untuk assign ke Level 3/4
- Tabel `plots` sudah ada
- Tabel `plant_types` sudah ada
- Index sudah dibuat untuk performa

### ✅ Frontend (Partial)
- Redirect login sudah diperbaiki:
  - Level 1/2 → `/dashboard`
  - Level 3/4 → `/lapangan`
- Halaman `/lapangan` sudah dibuat (placeholder)
- API functions sudah ditambahkan di `lib/api.ts`
- Dashboard sudah diupdate dengan placeholder untuk map

## Next Steps - Install Leaflet Dependencies

Untuk menggunakan map component, install dependencies berikut:

```bash
cd frontend
npm install leaflet react-leaflet leaflet-draw @types/leaflet @types/leaflet-draw
```

## Map Component Structure

Setelah install dependencies, buat komponen map di:
- `frontend/components/map/SimpleMapComponent.tsx` - Map sederhana untuk dashboard Level 1/2
- `frontend/components/map/MapWrapper.tsx` - Wrapper untuk dynamic import

## Fitur yang Perlu Diimplementasikan di Map Component

1. **Draw Fields** (Polygon/Rectangle/Circle)
   - Gunakan Leaflet.draw untuk drawing tools
   - Simpan coordinates sebagai JSONB di database
   - Calculate area otomatis

2. **Add Plots** (Markers)
   - Storage, Workshop, Garage, Sensor markers
   - Auto-detect field yang mengandung plot
   - Assign field_ref otomatis

3. **Assign Fields to Users**
   - Dropdown untuk pilih user Level 3/4
   - Update `user_id` di field
   - Validasi: hanya Level 3/4 yang bisa di-assign

4. **View Existing Fields & Plots**
   - Load dari API dan render di map
   - Popup dengan info field/plot
   - Edit/Delete functionality

## API Usage Examples

### Create Field
```typescript
await fieldsAPI.createField({
  name: "Field 1",
  description: "Test field",
  coordinates: [[-4.079, 104.167], [-4.080, 104.168], ...], // polygon coordinates
  draw_type: "polygon",
  area: 12.5,
  plant_type_id: 1,
  soil_type_id: 1,
  user_id: 5 // Optional: assign to Level 3/4 user
})
```

### Create Plot
```typescript
await plotsAPI.createPlot({
  name: "Storage 1",
  description: "Main storage",
  type: "storage",
  apikey: "api-key-123",
  coordinates: [-4.079, 104.167], // [lat, lng]
  field_ref: 1 // Optional: reference to field
})
```

### Assign Field to User
```typescript
await fieldsAPI.assignFieldToUser(fieldId, userId) // userId bisa null untuk unassign
```

### Get Users Level 3/4
```typescript
const users = await usersAPI.listUsers(1, 100, "Level 3") // Filter by role
```

## Testing

1. **Test Backend APIs:**
   ```bash
   # Test fields endpoint
   curl http://localhost:8000/api/fields
   
   # Test plots endpoint
   curl http://localhost:8000/api/plots
   
   # Test plant-types endpoint
   curl http://localhost:8000/api/plant-types
   ```

2. **Test Frontend:**
   - Login sebagai Level 1/2 → harus redirect ke `/dashboard`
   - Login sebagai Level 3/4 → harus redirect ke `/lapangan`
   - Dashboard harus show placeholder untuk map

## Notes

- Coordinates disimpan sebagai JSONB di PostgreSQL
- Field bisa di-assign ke multiple users (one-to-many relationship)
- Plot bisa reference ke field (field_ref)
- Area dihitung otomatis di frontend sebelum save

