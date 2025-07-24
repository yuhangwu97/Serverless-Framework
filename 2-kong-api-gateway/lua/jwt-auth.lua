-- JWT-based Authentication Lua Script for Kong
-- This script validates JWT tokens for /api/* routes

local jwt = require "resty.jwt"
local cjson = require "cjson"

local _M = {}

-- Configuration
local JWT_SECRET = os.getenv("JWT_SECRET") or "your-jwt-secret-key"
local JWT_ALGORITHM = "HS256"

-- Helper function to extract JWT token from Authorization header
local function extract_jwt_token()
    local headers = ngx.req.get_headers()
    local auth_header = headers["authorization"] or headers["Authorization"]
    
    if not auth_header then
        return nil, "Missing Authorization header"
    end
    
    -- Extract Bearer token
    local token = string.match(auth_header, "^Bearer%s+(.+)$")
    if not token then
        return nil, "Invalid Authorization header format. Expected 'Bearer <token>'"
    end
    
    return token, nil
end

-- Verify JWT token
local function verify_jwt_token(token)
    -- Verify the JWT token
    local jwt_obj = jwt:verify(JWT_SECRET, token, {
        alg = JWT_ALGORITHM
    })
    
    if not jwt_obj then
        return false, nil, "Failed to parse JWT token"
    end
    
    if not jwt_obj.valid then
        local reason = jwt_obj.reason or "Invalid token"
        return false, nil, reason
    end
    
    -- Check expiration
    local payload = jwt_obj.payload
    if payload.exp and payload.exp < ngx.time() then
        return false, nil, "Token has expired"
    end
    
    -- Check required claims
    if not payload.userId then
        return false, nil, "Missing userId claim in token"
    end
    
    return true, payload, "Token is valid"
end

-- Check if the route requires authentication
local function requires_authentication()
    local uri = ngx.var.uri
    
    -- Public endpoints that don't require authentication
    local public_endpoints = {
        "/health",
        "/api/health",
        "/api/docs",
        "/api/swagger"
    }
    
    for _, endpoint in ipairs(public_endpoints) do
        if uri == endpoint or string.match(uri, "^" .. endpoint .. "/") then
            return false
        end
    end
    
    return true
end

-- Main authentication function
function _M.authenticate()
    -- Check if authentication is required
    if not requires_authentication() then
        ngx.log(ngx.INFO, "Public endpoint accessed: ", ngx.var.uri)
        return true, "Public endpoint"
    end
    
    local token, extract_error = extract_jwt_token()
    if not token then
        ngx.log(ngx.INFO, "JWT extraction failed: ", extract_error)
        return false, extract_error
    end
    
    local is_valid, payload, verify_error = verify_jwt_token(token)
    if not is_valid then
        ngx.log(ngx.INFO, "JWT verification failed: ", verify_error)
        return false, verify_error
    end
    
    -- Add user information to headers for downstream services
    ngx.req.set_header("X-User-ID", payload.userId)
    ngx.req.set_header("X-Username", payload.username or "")
    ngx.req.set_header("X-Auth-Method", "jwt")
    ngx.req.set_header("X-Token-Exp", tostring(payload.exp or 0))
    
    -- Log successful authentication
    ngx.log(ngx.INFO, "JWT authentication successful for user: ", payload.username or payload.userId)
    
    return true, "Authentication successful"
end

-- Rate limiting for failed JWT attempts
local function check_jwt_rate_limit(client_ip)
    local limit_key = "jwt_auth_fail:" .. client_ip
    local redis = require("resty.redis"):new()
    
    -- Connect to Redis (if available)
    local ok, err = redis:connect("redis", 6379)
    if not ok then
        ngx.log(ngx.WARN, "Failed to connect to Redis: ", err)
        return true -- Allow if Redis is not available
    end
    
    local attempts = redis:get(limit_key)
    if attempts == ngx.null then
        attempts = 0
    else
        attempts = tonumber(attempts) or 0
    end
    
    if attempts >= 10 then -- Higher limit for API endpoints
        ngx.log(ngx.WARN, "JWT rate limit exceeded for IP: ", client_ip)
        return false
    end
    
    -- Increment counter on failed attempts
    redis:incr(limit_key)
    redis:expire(limit_key, 300) -- 5 minutes
    redis:close()
    
    return true
end

-- Security headers
local function add_security_headers()
    ngx.header["X-Content-Type-Options"] = "nosniff"
    ngx.header["X-Frame-Options"] = "DENY"
    ngx.header["X-XSS-Protection"] = "1; mode=block"
    ngx.header["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
end

-- Main execution
function _M.execute()
    local client_ip = ngx.var.remote_addr
    
    -- Add security headers
    add_security_headers()
    
    -- Check rate limiting
    if not check_jwt_rate_limit(client_ip) then
        ngx.status = 429
        ngx.header["Content-Type"] = "application/json"
        ngx.say(cjson.encode({
            success = false,
            error = "Too many failed authentication attempts",
            code = "RATE_LIMITED",
            retry_after = 300
        }))
        ngx.exit(429)
    end
    
    local success, message = _M.authenticate()
    
    if not success then
        -- Record failed attempt for rate limiting
        local redis = require("resty.redis"):new()
        local ok, err = redis:connect("redis", 6379)
        if ok then
            local limit_key = "jwt_auth_fail:" .. client_ip
            redis:incr(limit_key)
            redis:expire(limit_key, 300)
            redis:close()
        end
        
        ngx.status = 401
        ngx.header["Content-Type"] = "application/json"
        ngx.header["WWW-Authenticate"] = 'Bearer realm="API", error="invalid_token"'
        ngx.say(cjson.encode({
            success = false,
            error = message,
            code = "AUTHENTICATION_FAILED"
        }))
        ngx.exit(401)
    end
    
    -- Authentication successful, continue to upstream
end

-- Request logging for audit
function _M.log_request()
    local headers = ngx.req.get_headers()
    local user_id = headers["X-User-ID"] or "anonymous"
    local method = ngx.req.get_method()
    local uri = ngx.var.uri
    local status = ngx.status
    
    ngx.log(ngx.INFO, string.format("API_ACCESS: user_id=%s method=%s uri=%s status=%d", 
        user_id, method, uri, status))
end

return _M