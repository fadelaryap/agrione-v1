# PowerShell script to test PostgreSQL connection
# Run this: .\test-connection.ps1

Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow

# Test 1: From Docker container
Write-Host "`n1. Testing from Docker container..." -ForegroundColor Cyan
docker exec agrione_postgres psql -U agrione -d agrione_db -c "SELECT 'Connection successful!' as status, current_user, current_database();"

# Test 2: Using docker exec with password
Write-Host "`n2. Testing with password via environment..." -ForegroundColor Cyan
docker exec -e PGPASSWORD=agrione123 agrione_postgres psql -U agrione -d agrione_db -c "SELECT 'Password auth successful!' as status;"

Write-Host "`nIf both tests pass, the database and password are correct." -ForegroundColor Green
Write-Host "The issue is likely with the client application (DBeaver/VS Code) settings." -ForegroundColor Yellow


