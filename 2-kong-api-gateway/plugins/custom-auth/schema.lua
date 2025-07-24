-- Custom Authentication Plugin Schema for Kong

local typedefs = require "kong.db.schema.typedefs"

return {
  name = "custom-auth",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          { session_secret = { type = "string", default = "your-session-secret-key" } },
          { jwt_secret = { type = "string", default = "your-jwt-secret-key" } },
          { cookie_name = { type = "string", default = "connect.sid" } },
          { rate_limit_per_minute = { type = "number", default = 100 } },
          { rate_limit_burst = { type = "number", default = 20 } },
          { enable_security_checks = { type = "boolean", default = true } },
          { enable_geo_blocking = { type = "boolean", default = false } },
          { blocked_user_agents = { type = "array", elements = { type = "string" }, default = {} } },
          { allowed_origins = { type = "array", elements = { type = "string" }, default = {} } },
          { nodejs_service_url = { type = "string", default = "http://nodejs:3001" } },
          { redis_host = { type = "string", default = "redis" } },
          { redis_port = { type = "number", default = 6379 } },
          { redis_timeout = { type = "number", default = 1000 } },
          { log_level = { type = "string", default = "info" } },
          { block_duration = { type = "number", default = 3600 } }, -- 1 hour in seconds
        }
      }
    }
  }
}