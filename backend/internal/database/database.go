package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"agrione/backend/internal/config"

	_ "github.com/lib/pq"
)

func Init(cfg *config.Config) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Retry connection with backoff
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		if err := db.Ping(); err != nil {
			if i < maxRetries-1 {
				log.Printf("Database connection attempt %d/%d failed, retrying...", i+1, maxRetries)
				time.Sleep(time.Duration(i+1) * time.Second)
				continue
			}
			return nil, fmt.Errorf("failed to ping database after %d attempts: %w", maxRetries, err)
		}
		break
	}

	log.Println("Database connection established")
	return db, nil
}

func RunMigrations(db *sql.DB) error {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		username VARCHAR(100) UNIQUE NOT NULL,
		first_name VARCHAR(100) NOT NULL,
		last_name VARCHAR(100) NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(50) DEFAULT 'user' NOT NULL,
		status VARCHAR(20) DEFAULT 'pending' NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
	`

	_, err := db.Exec(createTableQuery)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Add new columns if table already exists (for existing databases)
	alterTableQuery := `
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
			ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
			ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
			ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
			ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' NOT NULL;
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
			ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_users_username') THEN
			CREATE INDEX idx_users_username ON users(username);
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_users_status') THEN
			CREATE INDEX idx_users_status ON users(status);
		END IF;
	END $$;
	`

	_, err = db.Exec(alterTableQuery)
	if err != nil {
		log.Printf("Warning: Failed to run alter table migrations: %v", err)
	}

	// Create plant_types table
	createPlantTypesQuery := `
	CREATE TABLE IF NOT EXISTS plant_types (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_plant_types_name ON plant_types(name);
	`

	_, err = db.Exec(createPlantTypesQuery)
	if err != nil {
		return fmt.Errorf("failed to create plant_types table: %w", err)
	}

	// Insert default plant types if table is empty
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM plant_types").Scan(&count)
	if err == nil && count == 0 {
		defaultPlantTypes := []string{
			"Padi",
			"Jagung",
			"Kedelai",
			"Kacang Tanah",
			"Ubi Kayu",
			"Ubi Jalar",
			"Tebu",
			"Karet",
			"Kelapa Sawit",
			"Kopi",
			"Teh",
			"Cokelat",
		}
		for _, name := range defaultPlantTypes {
			_, err = db.Exec("INSERT INTO plant_types (name) VALUES ($1) ON CONFLICT DO NOTHING", name)
			if err != nil {
				log.Printf("Warning: Failed to insert default plant type %s: %v", name, err)
			}
		}
		log.Println("Default plant types inserted")
	}

	// Create fields table
	createFieldsQuery := `
	CREATE TABLE IF NOT EXISTS fields (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		description TEXT,
		area DOUBLE PRECISION,
		coordinates JSONB NOT NULL,
		draw_type VARCHAR(50) NOT NULL,
		plant_type_id INTEGER REFERENCES plant_types(id) ON DELETE SET NULL,
		soil_type_id INTEGER,
		user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_fields_plant_type ON fields(plant_type_id);
	CREATE INDEX IF NOT EXISTS idx_fields_name ON fields(name);
	CREATE INDEX IF NOT EXISTS idx_fields_user_id ON fields(user_id);
	`

	_, err = db.Exec(createFieldsQuery)
	if err != nil {
		return fmt.Errorf("failed to create fields table: %w", err)
	}

	// Create plots table
	createPlotsQuery := `
	CREATE TABLE IF NOT EXISTS plots (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		description TEXT,
		type VARCHAR(50) NOT NULL,
		apikey VARCHAR(255) UNIQUE NOT NULL,
		coordinates JSONB NOT NULL,
		field_ref INTEGER REFERENCES fields(id) ON DELETE CASCADE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_plots_field_ref ON plots(field_ref);
	CREATE INDEX IF NOT EXISTS idx_plots_apikey ON plots(apikey);
	CREATE INDEX IF NOT EXISTS idx_plots_name ON plots(name);
	`

	_, err = db.Exec(createPlotsQuery)
	if err != nil {
		return fmt.Errorf("failed to create plots table: %w", err)
	}

	// Create field_reports table
	createFieldReportsQuery := `
	CREATE TABLE IF NOT EXISTS field_reports (
		id SERIAL PRIMARY KEY,
		title VARCHAR(255) NOT NULL,
		description TEXT,
		condition VARCHAR(50) NOT NULL,
		coordinates JSONB NOT NULL,
		notes TEXT,
		submitted_by VARCHAR(255) NOT NULL,
		work_order_id INTEGER,
		media JSONB DEFAULT '[]'::jsonb,
		status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
		approved_by VARCHAR(255),
		approved_at TIMESTAMP,
		rejection_reason TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_field_reports_submitted_by ON field_reports(submitted_by);
	CREATE INDEX IF NOT EXISTS idx_field_reports_work_order ON field_reports(work_order_id);
	CREATE INDEX IF NOT EXISTS idx_field_reports_created_at ON field_reports(created_at);

	-- Create field_report_comments table
	CREATE TABLE IF NOT EXISTS field_report_comments (
		id SERIAL PRIMARY KEY,
		field_report_id INTEGER REFERENCES field_reports(id) ON DELETE CASCADE,
		comment TEXT NOT NULL,
		commented_by VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_field_report_comments_field_report_id ON field_report_comments(field_report_id);
	CREATE INDEX IF NOT EXISTS idx_field_report_comments_created_at ON field_report_comments(created_at);

	-- Create notifications table
	CREATE TABLE IF NOT EXISTS notifications (
		id SERIAL PRIMARY KEY,
		user_id INTEGER NOT NULL,
		type VARCHAR(50) NOT NULL,
		title VARCHAR(255) NOT NULL,
		message TEXT NOT NULL,
		link VARCHAR(500),
		read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
	CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
	CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
	`

	_, err = db.Exec(createFieldReportsQuery)
	if err != nil {
		return fmt.Errorf("failed to create field_reports table: %w", err)
	}

	// Create inventory_items table
	createInventoryItemsQuery := `
	CREATE TABLE IF NOT EXISTS inventory_items (
		id SERIAL PRIMARY KEY,
		sku VARCHAR(100) UNIQUE NOT NULL,
		name VARCHAR(255) NOT NULL,
		category VARCHAR(100) NOT NULL,
		unit VARCHAR(50) NOT NULL,
		reorder_point DOUBLE PRECISION NOT NULL DEFAULT 0,
		status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
		avg_cost DOUBLE PRECISION DEFAULT 0,
		description TEXT,
		suppliers JSONB DEFAULT '[]'::jsonb,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
	CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
	CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
	CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
	`

	_, err = db.Exec(createInventoryItemsQuery)
	if err != nil {
		return fmt.Errorf("failed to create inventory_items table: %w", err)
	}

	// Create stock_lots table
	createStockLotsQuery := `
	CREATE TABLE IF NOT EXISTS stock_lots (
		id SERIAL PRIMARY KEY,
		lot_id VARCHAR(100) UNIQUE NOT NULL,
		item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
		warehouse_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
		batch_no VARCHAR(100) NOT NULL,
		quantity DOUBLE PRECISION NOT NULL,
		unit_cost DOUBLE PRECISION NOT NULL,
		total_cost DOUBLE PRECISION NOT NULL,
		expiry_date TIMESTAMP,
		supplier VARCHAR(255) NOT NULL,
		status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'expired', 'depleted')),
		notes TEXT,
		received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_stock_lots_item_id ON stock_lots(item_id);
	CREATE INDEX IF NOT EXISTS idx_stock_lots_warehouse_id ON stock_lots(warehouse_id);
	CREATE INDEX IF NOT EXISTS idx_stock_lots_lot_id ON stock_lots(lot_id);
	CREATE INDEX IF NOT EXISTS idx_stock_lots_status ON stock_lots(status);
	CREATE INDEX IF NOT EXISTS idx_stock_lots_expiry_date ON stock_lots(expiry_date);
	`

	_, err = db.Exec(createStockLotsQuery)
	if err != nil {
		return fmt.Errorf("failed to create stock_lots table: %w", err)
	}

	// Create stock_movements table
	createStockMovementsQuery := `
	CREATE TABLE IF NOT EXISTS stock_movements (
		id SERIAL PRIMARY KEY,
		movement_id VARCHAR(100) UNIQUE NOT NULL,
		item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
		lot_id INTEGER REFERENCES stock_lots(id) ON DELETE SET NULL,
		warehouse_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
		type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'transfer', 'adjustment')),
		quantity DOUBLE PRECISION NOT NULL,
		unit_cost DOUBLE PRECISION NOT NULL,
		total_cost DOUBLE PRECISION NOT NULL,
		reason VARCHAR(255) NOT NULL,
		reference VARCHAR(255),
		performed_by VARCHAR(255) NOT NULL,
		notes TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
	CREATE INDEX IF NOT EXISTS idx_stock_movements_lot_id ON stock_movements(lot_id);
	CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
	CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
	CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_id ON stock_movements(movement_id);
	CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
	`

	_, err = db.Exec(createStockMovementsQuery)
	if err != nil {
		return fmt.Errorf("failed to create stock_movements table: %w", err)
	}

	// Add new columns to field_reports if table already exists (for existing databases) - moved to after attendance table creation
	alterFieldReportsQuery := `
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='status') THEN
			ALTER TABLE field_reports ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='approved_by') THEN
			ALTER TABLE field_reports ADD COLUMN approved_by VARCHAR(255);
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='approved_at') THEN
			ALTER TABLE field_reports ADD COLUMN approved_at TIMESTAMP;
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='rejection_reason') THEN
			ALTER TABLE field_reports ADD COLUMN rejection_reason TEXT;
		END IF;
		-- Update existing records to have 'pending' status if status is NULL
		UPDATE field_reports SET status = 'pending' WHERE status IS NULL;
	END $$;

	-- Add harvest quantity and quality columns for Panen activity
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='harvest_quantity') THEN
			ALTER TABLE field_reports ADD COLUMN harvest_quantity DOUBLE PRECISION;
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='harvest_quality') THEN
			ALTER TABLE field_reports ADD COLUMN harvest_quality VARCHAR(100);
		END IF;
	END $$;
	`

	// Add notifications table columns if already exists
	alterNotificationsQuery := `
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
			CREATE TABLE notifications (
				id SERIAL PRIMARY KEY,
				user_id INTEGER NOT NULL,
				type VARCHAR(50) NOT NULL,
				title VARCHAR(255) NOT NULL,
				message TEXT NOT NULL,
				link VARCHAR(500),
				read BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
			CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
			CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
		END IF;
	END $$;
	`

	_, err = db.Exec(alterFieldReportsQuery)
	if err != nil {
		log.Printf("Warning: Failed to run alter table migrations for field_reports: %v", err)
	}

	// Create notifications table if not exists
	_, err = db.Exec(alterNotificationsQuery)
	if err != nil {
		log.Printf("Warning: Failed to create notifications table: %v", err)
	}

	// Create attendance table
	createAttendanceQuery := `
	CREATE TABLE IF NOT EXISTS attendance (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		date DATE NOT NULL,
		session VARCHAR(20) NOT NULL CHECK (session IN ('pagi', 'sore')),
		selfie_image TEXT NOT NULL,
		back_camera_image TEXT,
		has_issue BOOLEAN DEFAULT false,
		description TEXT,
		latitude DOUBLE PRECISION,
		longitude DOUBLE PRECISION,
		check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		check_out_time TIMESTAMP,
		status VARCHAR(50) DEFAULT 'hadir' NOT NULL,
		notes TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, date, session)
	);

	CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
	CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
	CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

	-- Add GPS columns to existing attendance table if they don't exist
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='latitude') THEN
			ALTER TABLE attendance ADD COLUMN latitude DOUBLE PRECISION;
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='longitude') THEN
			ALTER TABLE attendance ADD COLUMN longitude DOUBLE PRECISION;
		END IF;
	END $$;
	`

	_, err = db.Exec(createAttendanceQuery)
	if err != nil {
		return fmt.Errorf("failed to create attendance table: %w", err)
	}

	// Create work_orders table
	createWorkOrdersQuery := `
	CREATE TABLE IF NOT EXISTS work_orders (
		id SERIAL PRIMARY KEY,
		title VARCHAR(255) NOT NULL,
		category VARCHAR(100) NOT NULL,
		activity VARCHAR(100) NOT NULL,
		status VARCHAR(50) DEFAULT 'pending' NOT NULL,
		priority VARCHAR(50) DEFAULT 'medium' NOT NULL,
		assignee VARCHAR(255) NOT NULL,
		field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
		start_date DATE NOT NULL,
		end_date DATE NOT NULL,
		progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
		description TEXT,
		requirements JSONB DEFAULT '[]'::jsonb,
		actual_hours INTEGER DEFAULT 0,
		notes TEXT,
		created_by VARCHAR(255) NOT NULL,
		last_updated_by VARCHAR(255),
		completed_date TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_work_orders_field_id ON work_orders(field_id);
	CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
	CREATE INDEX IF NOT EXISTS idx_work_orders_category ON work_orders(category);
	CREATE INDEX IF NOT EXISTS idx_work_orders_start_date ON work_orders(start_date);
	CREATE INDEX IF NOT EXISTS idx_work_orders_end_date ON work_orders(end_date);
	CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(assignee);
	`

	_, err = db.Exec(createWorkOrdersQuery)
	if err != nil {
		return fmt.Errorf("failed to create work_orders table: %w", err)
	}

	// Create cultivation_seasons table
	createCultivationSeasonsQuery := `
	CREATE TABLE IF NOT EXISTS cultivation_seasons (
		id SERIAL PRIMARY KEY,
		field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		planting_date DATE NOT NULL,
		status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
		completed_date TIMESTAMP,
		notes TEXT,
		created_by VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_cultivation_seasons_field_id ON cultivation_seasons(field_id);
	CREATE INDEX IF NOT EXISTS idx_cultivation_seasons_status ON cultivation_seasons(status);
	CREATE INDEX IF NOT EXISTS idx_cultivation_seasons_planting_date ON cultivation_seasons(planting_date);
	`

	_, err = db.Exec(createCultivationSeasonsQuery)
	if err != nil {
		return fmt.Errorf("failed to create cultivation_seasons table: %w", err)
	}

	// Add cultivation_season_id column to work_orders table
	alterWorkOrdersQuery := `
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='cultivation_season_id') THEN
			ALTER TABLE work_orders ADD COLUMN cultivation_season_id INTEGER REFERENCES cultivation_seasons(id) ON DELETE SET NULL;
			CREATE INDEX IF NOT EXISTS idx_work_orders_cultivation_season_id ON work_orders(cultivation_season_id);
		END IF;
	END $$;
	`

	_, err = db.Exec(alterWorkOrdersQuery)
	if err != nil {
		return fmt.Errorf("failed to add cultivation_season_id to work_orders: %w", err)
	}

	log.Println("Database migrations completed")
	return nil
}




