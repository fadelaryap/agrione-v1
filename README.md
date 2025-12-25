# Agrione - Full Stack Application

A modern full-stack application built with Golang backend, Next.js frontend, and PostgreSQL database, all containerized with Docker.

## Tech Stack

- **Backend**: Golang (Gorilla Mux, JWT, CSRF, CORS)
- **Frontend**: Next.js 14 (TypeScript, React, Tailwind CSS)
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose

## Features

- ✅ User Authentication (Signup/Login)
- ✅ JWT Token-based Authentication
- ✅ CSRF Protection
- ✅ CORS Configuration
- ✅ Secure Password Hashing (bcrypt)
- ✅ Server-side Session Management
- ✅ Modern UI with Tailwind CSS
- ✅ Type-safe API with TypeScript

## Project Structure

```
agrione/
├── backend/          # Golang backend API
│   ├── internal/
│   │   ├── config/   # Configuration management
│   │   ├── database/ # Database connection & migrations
│   │   ├── handlers/ # HTTP handlers
│   │   └── middleware/ # Auth, CORS middleware
│   ├── main.go       # Application entry point
│   └── Dockerfile
├── frontend/         # Next.js frontend
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utilities & API client
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Git (optional, for cloning)

### Quick Start

**Ya, bisa langsung pakai!** Default secrets sudah diset untuk development, jadi tidak perlu ubah-ubah apapun.

1. **Clone or navigate to the project directory**

2. **Build and start all services:**
```bash
docker-compose up --build -d
```

Atau menggunakan Make (jika tersedia):
```bash
make build
make up
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Health Check: http://localhost:8000/api/health

**Catatan:** Untuk development, default secrets sudah cukup. Untuk production, **WAJIB** ubah semua secrets di environment variables!

### Environment Configuration (Optional untuk Development)

Default values sudah diset dan bisa langsung dipakai untuk development:
- `POSTGRES_USER=agrione`
- `POSTGRES_PASSWORD=agrione123`
- `POSTGRES_DB=agrione_db`
- `JWT_SECRET=your-super-secret-jwt-key-change-in-production`
- `CSRF_SECRET=your-csrf-secret-key-change-in-production`

Jika ingin custom, buat file `.env` di root directory dengan values di atas.

**⚠️ PENTING:** Untuk production, **WAJIB** ubah semua secrets dengan values yang kuat dan unik!

### Services

The application consists of three services:
- **PostgreSQL** on port `5432` (internal)
- **Golang Backend** on port `8000`
- **Next.js Frontend** on port `3000`

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Health Check: http://localhost:8000/api/health

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `GET /api/csrf` - Get CSRF token (required for POST requests)
- `POST /api/signup` - User registration
  ```json
  {
    "email": "user@example.com",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "password": "password123",
    "confirm_password": "password123",
    "role": "user"
  }
  ```
  **Note:** `role` is optional, defaults to "user". Valid roles: "user", "admin"
- `POST /api/login` - User login
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Protected Endpoints (Require JWT Token)

- `GET /api/profile` - Get user profile
- `POST /api/logout` - Logout user

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

## Development

### Running Services Individually

#### Backend Development

```bash
cd backend
go mod download
go run main.go
```

The backend will run on `http://localhost:8000`

#### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

### Using Docker Compose

For development with hot-reload:

```bash
# Start all services
docker-compose up

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build
```

### shadcn/ui Components

The project is configured for shadcn/ui. To add components:

```bash
cd frontend
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

The configuration is already set up in `components.json`.

## Security Features

1. **JWT Authentication**: Secure token-based authentication with 7-day expiration
2. **CSRF Protection**: Cross-Site Request Forgery protection using gorilla/csrf
3. **CORS**: Configured Cross-Origin Resource Sharing with trusted origins
4. **Password Hashing**: Bcrypt with default cost (10 rounds)
5. **Input Validation**: Server-side validation for all inputs
6. **SQL Injection Prevention**: Parameterized queries using database/sql
7. **Secure Headers**: Proper CORS and CSRF headers
8. **Server-side Session**: JWT verification on Next.js server-side

## Environment Variables

### Backend
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret key for JWT signing
- `CSRF_SECRET` - Secret key for CSRF protection
- `CORS_ORIGIN` - Allowed CORS origin

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `JWT_SECRET` - JWT secret for server-side verification

## Production Deployment

Before deploying to production:

1. Change all default secrets in environment variables
2. Set `csrf.Secure(true)` in `backend/main.go` for HTTPS
3. Use environment-specific database credentials
4. Configure proper CORS origins
5. Enable HTTPS/SSL certificates
6. Set up proper logging and monitoring

## License

MIT

"# agrione-v1" 
