#!/bin/bash
# Script to fix PostgreSQL password authentication

docker exec agrione_postgres psql -U agrione -d agrione_db <<EOF
-- Reset password
ALTER USER agrione WITH PASSWORD 'agrione123';

-- Verify user exists
SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'agrione';

-- Reload configuration
SELECT pg_reload_conf();
EOF

echo "Password reset completed. Try connecting again with:"
echo "  Username: agrione"
echo "  Password: agrione123"
echo "  Database: agrione_db"

