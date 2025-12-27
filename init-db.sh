#!/bin/bash
set -e

# Create default database 'agrione' if it doesn't exist
# This prevents "database does not exist" errors when connecting without specifying database name
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE agrione'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agrione')\gexec
EOSQL

echo "Default database 'agrione' created (if it didn't exist)"


