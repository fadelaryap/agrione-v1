# Test REAL external connection from Windows host
# This requires psql installed on Windows, or we can use a different method

Write-Host "Testing REAL external connection from Windows host..." -ForegroundColor Yellow
Write-Host ""

# Method 1: Check if port is accessible
Write-Host "1. Checking if port 5432 is accessible..." -ForegroundColor Cyan
$result = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "   ✓ Port 5432 is accessible" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 5432 is NOT accessible" -ForegroundColor Red
    exit 1
}

# Method 2: Try to connect using telnet (if available)
Write-Host "`n2. Testing connection..." -ForegroundColor Cyan
Write-Host "   If you have psql installed, run:" -ForegroundColor Yellow
Write-Host "   psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db" -ForegroundColor White
Write-Host "   Password: agrione123" -ForegroundColor White

# Method 3: Check Docker port mapping
Write-Host "`n3. Checking Docker port mapping..." -ForegroundColor Cyan
docker port agrione_postgres

Write-Host "`n4. Current pg_hba.conf rules:" -ForegroundColor Cyan
docker exec agrione_postgres cat /var/lib/postgresql/data/pg_hba.conf | Select-String -Pattern "host.*all"

Write-Host "`nIf port is accessible but still can't connect, the issue is likely:" -ForegroundColor Yellow
Write-Host "  - Password authentication method" -ForegroundColor White
Write-Host "  - pg_hba.conf configuration" -ForegroundColor White
Write-Host "  - User password hash" -ForegroundColor White

