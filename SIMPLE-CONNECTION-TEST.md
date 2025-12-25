# Simple Connection Test

## Endpoint Test Database:
**GET** `http://localhost:8000/api/user`

Buka di browser atau test dengan:
- Browser: http://localhost:8000/api/user
- Postman: GET http://localhost:8000/api/user
- VS Code REST Client extension

## Response:
```json
{
  "status": "success",
  "message": "Database connection successful",
  "database": "agrione_db",
  "user_count": 0
}
```

Jika `status: "success"`, berarti Golang sudah connect ke database dengan benar!

## Untuk DBeaver/VS Code Connection:

Coba dengan settings ini (PostgreSQL 18 default):

```
Host: 127.0.0.1
Port: 5432
Database: agrione_db
Username: agrione
Password: agrione123
SSL: Disable
```

**Catatan:** Jika masih error password, mungkin PostgreSQL 18 menggunakan authentication method yang berbeda. Coba:
1. Hapus connection lama
2. Buat connection baru
3. Pastikan password diketik manual (bukan copy-paste)

