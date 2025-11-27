# 🚀 Mockzilla Docker - Quick Reference

## ⚡ Quick Commands

### Start Development
```bash
make dev-up
# or
./docker-helper.sh  # Interactive menu
```

### View Logs
```bash
make dev-logs
```

### Stop Development
```bash
make dev-down
```

### Rebuild Containers
```bash
make dev-build
```

## 📍 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Application | http://localhost:36666 | Main Next.js app |
| Database | localhost:5432 | PostgreSQL database |
| Drizzle Studio | http://localhost:4983 | Database UI (run `make db-studio`) |

## 🗂️ Files Created

### Docker Configuration
- `Dockerfile` - Production build (multi-stage, optimized)
- `Dockerfile.dev` - Development build (hot-reload, volume mounts)
- `docker-compose.yaml` - Production compose
- `docker-compose.dev.yaml` - Development compose

### Helper Files
- `Makefile` - Quick commands for Docker operations
- `docker-helper.sh` - Interactive menu script
- `.env.example` - Environment variables template
- `DOCKER.md` - Comprehensive Docker documentation
- `README.md` - Updated with Docker instructions

## 🔧 Common Tasks

### Database Operations
```bash
# Open database shell
make db-shell

# Run migrations
docker exec -it mockzilla-app-dev bun run db:push

# Start Drizzle Studio
make db-studio
```

### Container Management
```bash
# Check status
docker ps --filter "name=mockzilla"

# Restart containers
make dev-restart

# Clean everything
make clean
```

## 🎯 Development vs Production

| Feature | Development | Production |
|---------|------------|------------|
| Hot Reload | ✅ Yes | ❌ No |
| Volume Mounts | ✅ Yes | ❌ No |
| Build Time | Fast | Slower |
| Image Size | Larger | Optimized |
| Drizzle Studio | ✅ Available | ❌ Not included |
| Runtime | Bun | Node Alpine |

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
make dev-logs

# Rebuild from scratch
make dev-build
make dev-up
```

### Database connection issues
```bash
# Check database health
docker ps --filter "name=postgres"

# Restart database
docker restart mockzilla-postgres-dev
```

### Port conflicts
Edit `docker-compose.dev.yaml` and change port mappings:
```yaml
ports:
  - "36666:36666"  # Change first number to different port
```

### Clean slate
```bash
make clean  # Removes all containers, volumes, and images
```

## 📚 Documentation

- **Full Docker Guide**: [DOCKER.md](./DOCKER.md)
- **Main README**: [README.md](./README.md)
- **All Commands**: Run `make help`

## 🎉 What's Working

✅ Development environment with hot-reloading  
✅ PostgreSQL database with persistent storage  
✅ Automatic database migrations on startup  
✅ Volume mounting for instant code updates  
✅ Drizzle Studio for database management  
✅ Production-ready Docker setup  
✅ Comprehensive documentation  
✅ Interactive helper script  

---

**Current Status**: ✅ Running
- Application: http://localhost:36666
- Database: Healthy and ready
