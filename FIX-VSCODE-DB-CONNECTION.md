# 🔧 Fix VS Code Database Connection ke PostgreSQL di VPS

## 📋 Troubleshooting Steps

### Step 1: Check Container Status

```bash
# Check apakah PostgreSQL container running
docker ps | grep postgres

# Atau
docker compose ps
```

**Jika container tidak running:**
```bash
cd /opt/agrione/agrione-v1
docker compose up -d postgres
```

### Step 2: Check Port Mapping

```bash
# Check apakah port 5432 sudah di-map
docker port agrione_postgres

# Atau
netstat -tuln | grep 5432
```

**Harus muncul:** `5432/tcp -> 0.0.0.0:5432`

### Step 3: Check Firewall

```bash
# Check firewall status
sudo ufw status

# Jika port 5432 tidak allowed, tambahkan:
sudo ufw allow 5432/tcp

# Reload firewall
sudo ufw reload
```

**Catatan:** Jika hanya connect dari local (SSH tunnel), tidak perlu buka port 5432 di firewall.

### Step 4: Test Connection dari VPS

```bash
# Test connection dari dalam VPS
docker exec -it agrione_postgres psql -U agrione -d agrione_db -c "SELECT version();"
```

**Jika ini berhasil, masalahnya di network/firewall, bukan PostgreSQL.**

### Step 5: Check PostgreSQL Config

```bash
# Check pg_hba.conf
docker exec agrione_postgres cat /var/lib/postgresql/data/pg_hba.conf | grep -v "^#"
```

**Harus ada line seperti:**
```
host    all             all             0.0.0.0/0                scram-sha-256
```

### Step 6: Restart PostgreSQL Container

```bash
# Restart container
docker compose restart postgres

# Check logs
docker compose logs postgres
```

---

## 🔌 VS Code Connection Settings

### Option 1: Direct Connection (Jika Port 5432 Terbuka)

**Connection Settings:**
- **Host:** `103.31.205.102` (VPS IP Anda)
- **Port:** `5432`
- **Database:** `agrione_db`
- **Username:** `agrione`
- **Password:** `agrione123`
- **SSL:** Disable (atau Prefer)

### Option 2: SSH Tunnel (Recommended - Lebih Aman)

**Connection Settings:**
- **Host:** `localhost` (atau `127.0.0.1`)
- **Port:** `5432`
- **Database:** `agrione_db`
- **Username:** `agrione`
- **Password:** `agrione123`
- **SSL:** Disable

**SSH Tunnel Settings:**
- **SSH Host:** `103.31.205.102`
- **SSH Port:** `22`
- **SSH User:** `fadelaryap` (atau user VPS Anda)
- **Local Port:** `5432`
- **Remote Host:** `localhost`
- **Remote Port:** `5432`

---

## 🔍 Common Issues

### Issue 1: "Connection Refused"

**Penyebab:** Port tidak di-expose atau firewall block

**Fix:**
```bash
# Check port mapping
docker port agrione_postgres

# Check firewall
sudo ufw status
sudo ufw allow 5432/tcp
```

### Issue 2: "Authentication Failed"

**Penyebab:** Password salah atau user tidak ada

**Fix:**
```bash
# Check user dan password
docker exec -it agrione_postgres psql -U agrione -d agrione_db -c "\du"

# Reset password (jika perlu)
docker exec -it agrione_postgres psql -U postgres -c "ALTER USER agrione WITH PASSWORD 'agrione123';"
```

### Issue 3: "Connection Timeout"

**Penyebab:** Firewall block atau port tidak accessible

**Fix:**
```bash
# Test dari local
telnet 103.31.205.102 5432

# Atau pakai SSH tunnel (lebih aman)
```

---

## ✅ Quick Fix Commands

```bash
# 1. Restart PostgreSQL
cd /opt/agrione/agrione-v1
docker compose restart postgres

# 2. Check logs
docker compose logs postgres | tail -20

# 3. Test connection
docker exec -it agrione_postgres psql -U agrione -d agrione_db -c "SELECT 1;"

# 4. Check port
docker port agrione_postgres

# 5. Check firewall (jika perlu direct connection)
sudo ufw allow 5432/tcp
```

---

## 🎯 Recommended: Pakai SSH Tunnel

**Lebih aman** karena tidak perlu buka port 5432 di firewall. VS Code akan otomatis create SSH tunnel.

**Setup di VS Code:**
1. Install extension "PostgreSQL" atau "Database Client"
2. Add new connection
3. Enable "SSH Tunnel"
4. Fill SSH credentials (VPS IP, user, port 22)
5. Fill database credentials (localhost:5432, user, password)

---

**Selesai!** 🎉

