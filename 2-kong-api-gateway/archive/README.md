# Kong Configuration Archive

This folder contains historical Kong configuration files that have been consolidated into the main `kong-config.yml` file.

## Archived Files

### Kong Configuration Files
- `kong-campus-refined.yml` - The most recent refined configuration with Kong Lua gRPC handling
- `kong-campus-simplified.yml` - Simplified version without complex gRPC routing
- `kong-campus.yml` - Original campus-specific configuration with gRPC Gateway
- `kong-enhanced.yml` - Enhanced version with additional plugins
- `kong.yml` - Basic Kong configuration

### Docker Compose Files
- `docker-compose.kong-enhanced.yml` - Enhanced Docker setup for Kong
- `docker-compose.kong.yml` - Basic Kong Docker setup

### Other Configuration
- `redis.conf` - Redis configuration (moved to docker/infrastructure/databases/redis/)

## Current Active Configuration

The active Kong configuration is now consolidated in:
- **Main Config**: `../kong-config.yml` - Unified Kong configuration with all features
- **Lua Clients**: 
  - `../kong-grpc-client.lua` - Generic gRPC client library
  - `../kong-business-grpc.lua` - Business service specific client

## Migration Notes

The new unified configuration includes:
- ✅ UI routes with Cookie/Session authentication
- ✅ API routes with JWT authentication  
- ✅ Kong Lua direct handling for `/api/business/summary`
- ✅ Middleware service aggregation for complex routes
- ✅ Direct analytics service access
- ✅ Global plugins (CORS, rate limiting, monitoring)
- ✅ Security headers and request tracking
- ❌ Removed gRPC Gateway routes (not needed)
- ❌ Removed redundant service definitions

## Restoration

If you need to restore any of these configurations:
1. Copy the desired file from this archive
2. Update the Docker Compose volume mounts
3. Restart the Kong services

These files are kept for historical reference and rollback purposes.