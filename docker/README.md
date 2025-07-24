# Docker Configuration

This folder contains all Docker-related configuration files for the Campus Management System.

## Files Structure

```
docker/
├── docker-compose.yml          # Main Docker Compose configuration
├── infrastructure/             # Database and infrastructure configurations
│   ├── databases/
│   │   ├── mongodb/
│   │   │   └── init/          # MongoDB initialization scripts
│   │   ├── mysql/
│   │   │   └── init/          # MySQL initialization scripts
│   │   └── redis/
│   │       └── redis.conf     # Redis configuration
│   └── ...
└── README.md                  # This file
```

## Services

The Docker Compose setup includes:

### Core Application Services
- **web-client** (Port 3000) - React frontend application
- **middleware-service** (Port 3001) - Node.js middle-platform aggregation service
- **business-service** (Port 9090) - Golang gRPC business logic service
- **analytics-service** (Port 8001) - Python analytics and data processing service

### Infrastructure Services
- **kong** (Port 8000) - API Gateway with refined routing
- **mongodb** (Port 27017) - User authentication and analytics data
- **mysql** (Port 3306) - Business data storage
- **redis** (Port 6379) - Caching and session storage
- **kong-database** - PostgreSQL for Kong configuration

### Management Tools
- **mongo-express** (Port 8082) - MongoDB web interface
- **phpmyadmin** (Port 8083) - MySQL web interface  
- **redis-commander** (Port 8081) - Redis web interface

## Usage

### From Project Root
```bash
# Using the launcher script
./docker-compose.sh up -d
./docker-compose.sh down
./docker-compose.sh logs -f
```

### From Docker Folder
```bash
cd docker
docker-compose up -d
docker-compose down
docker-compose logs -f
```

## Environment Variables

Key environment variables configured in docker-compose.yml:

- `MONGODB_URI` - MongoDB connection string for middleware-service
- `BUSINESS_GRPC_URL` - gRPC URL for business-service communication
- `ANALYTICS_SERVICE_URL` - HTTP URL for analytics-service
- `REACT_APP_API_URL` - Frontend API endpoint (Kong Gateway)

## Kong Configuration

The Kong API Gateway uses the refined configuration from `../api-gateway/kong-campus-refined.yml` with:

- UI routes with Cookie/Session authentication
- API routes with JWT authentication  
- Direct Kong Lua handling for performance-critical endpoints
- gRPC client integration for business-service calls

## Network

All services run on the `microservice-network` bridge network for internal communication.

## Data Persistence

The following volumes are created for data persistence:

- `mongodb_data` - MongoDB data
- `mysql_data` - MySQL data
- `redis_data` - Redis data
- `kong_data` - Kong configuration data

## Development

For development, you can run individual services or use the full stack. The configuration supports hot-reloading for frontend and middleware services.