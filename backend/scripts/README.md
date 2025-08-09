# Server Management Scripts

This directory contains scripts to easily manage the Crop Recommendation AI API server using Docker Compose.

## Quick Start

1. **Start the server:**
   ```bash
   ./scripts/start.sh
   ```

2. **Check status:**
   ```bash
   ./scripts/status.sh
   ```

3. **View logs:**
   ```bash
   ./scripts/logs.sh
   ```

4. **Stop the server:**
   ```bash
   ./scripts/stop.sh
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `start.sh` | Start all services (web, database, redis, celery) |
| `stop.sh` | Stop all services |
| `restart.sh` | Restart all services |
| `rebuild.sh` | Rebuild images and restart (use after code changes) |
| `status.sh` | Check service status and test API endpoints |
| `logs.sh` | View real-time logs from all services |
| `cleanup.sh` | Clean up Docker resources (containers, images, volumes) |
| `help.sh` | Show help information |

## Usage Examples

### Development Workflow

```bash
# Start the server
./scripts/start.sh

# Make code changes...

# Rebuild and restart (after code changes)
./scripts/rebuild.sh

# Check if everything is working
./scripts/status.sh

# View logs if there are issues
./scripts/logs.sh
```

### Troubleshooting

```bash
# If you encounter issues, try a clean restart
./scripts/cleanup.sh
./scripts/start.sh

# Check status to verify everything is working
./scripts/status.sh
```

## API Endpoints

Once the server is running, you can access:

- **API Root**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **Swagger UI**: http://localhost:5000/swagger-ui

## Requirements

- Docker and Docker Compose must be installed
- Scripts must be run from the project root directory
- Port 5000 must be available on your system

## Notes

- All scripts include error checking and helpful messages
- The `rebuild.sh` script removes old images to ensure a clean build
- The `cleanup.sh` script removes all Docker resources (use with caution)
- Logs can be viewed in real-time with `logs.sh` (press Ctrl+C to exit) 