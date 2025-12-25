# Test external connection to PostgreSQL
# This simulates what DBeaver/VS Code does - connecting from host to container

Write-Host "Testing EXTERNAL connection (from Windows host to Docker container)..." -ForegroundColor Yellow
Write-Host "This is what DBeaver/VS Code does!" -ForegroundColor Cyan
Write-Host ""

# Test using docker exec with explicit password (simulating external connection)
Write-Host "Test 1: Connection with password authentication..." -ForegroundColor Green
$env:PGPASSWORD = "agrione123"
docker exec -e PGPASSWORD=agrione123 agrione_postgres psql -h 127.0.0.1 -U agrione -d agrione_db -c "SELECT 'External connection successful!' as status, current_user, inet_server_addr(), inet_server_port();"

Write-Host ""
Write-Host "If this works, try connecting from DBeaver/VS Code with:" -ForegroundColor Yellow
Write-Host "  Host: 127.0.0.1" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host "  Database: agrione_db" -ForegroundColor White
Write-Host "  Username: agrione" -ForegroundColor White
Write-Host "  Password: agrione123" -ForegroundColor White
Write-Host "  SSL: Disable" -ForegroundColor White

