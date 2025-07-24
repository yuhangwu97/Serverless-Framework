-- Security and Rate Limiting Lua Script for Kong
-- This script provides additional security features and rate limiting

local cjson = require "cjson"
local resty_redis = require "resty.redis"

local _M = {}

-- Configuration
local RATE_LIMIT_WINDOW = 60 -- 1 minute
local RATE_LIMIT_REQUESTS = 100 -- requests per minute per IP
local RATE_LIMIT_BURST = 20 -- burst limit
local BLOCKED_IPS_KEY = "blocked_ips"
local SUSPICIOUS_PATTERNS = {
    "%.%.%/", -- Directory traversal
    "script>", -- XSS attempts
    "union.*select", -- SQL injection
    "eval%(", -- Code injection
    "system%(", -- Command injection
}

-- Redis connection helper
local function get_redis_connection()
    local redis = resty_redis:new()
    redis:set_timeout(1000) -- 1 second
    
    local ok, err = redis:connect("redis", 6379)
    if not ok then
        ngx.log(ngx.ERR, "Failed to connect to Redis: ", err)
        return nil
    end
    
    return redis
end

-- Check if IP is blocked
local function is_ip_blocked(client_ip)
    local redis = get_redis_connection()
    if not redis then
        return false -- Fail open if Redis is unavailable
    end
    
    local is_blocked = redis:sismember(BLOCKED_IPS_KEY, client_ip)
    redis:close()
    
    return is_blocked == 1
end

-- Block IP address
local function block_ip(client_ip, duration)
    local redis = get_redis_connection()
    if not redis then
        return false
    end
    
    redis:sadd(BLOCKED_IPS_KEY, client_ip)
    redis:expire(BLOCKED_IPS_KEY, duration or 3600) -- 1 hour default
    redis:close()
    
    ngx.log(ngx.WARN, "Blocked IP: ", client_ip)
    return true
end

-- Rate limiting check
local function check_rate_limit(client_ip)
    local redis = get_redis_connection()
    if not redis then
        return true -- Fail open if Redis is unavailable
    end
    
    local key = "rate_limit:" .. client_ip
    local current_time = ngx.time()
    local window_start = current_time - RATE_LIMIT_WINDOW
    
    -- Remove old entries
    redis:zremrangebyscore(key, 0, window_start)
    
    -- Count current requests
    local current_requests = redis:zcard(key)
    
    if current_requests >= RATE_LIMIT_REQUESTS then
        redis:close()
        return false, "Rate limit exceeded"
    end
    
    -- Add current request
    redis:zadd(key, current_time, current_time .. ":" .. math.random(10000))
    redis:expire(key, RATE_LIMIT_WINDOW)
    redis:close()
    
    return true, "OK"
end

-- Check for suspicious patterns
local function check_suspicious_patterns(request_data)
    local uri = ngx.var.uri
    local args = ngx.var.args or ""
    local body_data = request_data or ""
    
    local combined_data = string.lower(uri .. " " .. args .. " " .. body_data)
    
    for _, pattern in ipairs(SUSPICIOUS_PATTERNS) do
        if string.match(combined_data, pattern) then
            return true, pattern
        end
    end
    
    return false, nil
end

-- Check request headers for suspicious activity
local function check_suspicious_headers()
    local headers = ngx.req.get_headers()
    
    -- Check User-Agent
    local user_agent = headers["user-agent"] or ""
    local suspicious_agents = {
        "sqlmap", "nikto", "nessus", "openvas", "nmap",
        "masscan", "zap", "w3af", "skipfish"
    }
    
    for _, agent in ipairs(suspicious_agents) do
        if string.find(string.lower(user_agent), agent) then
            return true, "Suspicious User-Agent: " .. agent
        end
    end
    
    -- Check for missing common headers
    if not headers["user-agent"] and not headers["accept"] then
        return true, "Missing common headers"
    end
    
    return false, nil
end

-- Geographic IP filtering (simplified)
local function check_geo_restrictions(client_ip)
    -- This is a simplified example
    -- In production, you'd integrate with a GeoIP service
    
    -- Block common malicious IP ranges (simplified)
    local blocked_ranges = {
        "192.168.", -- Private networks shouldn't reach here from outside
        "10.", -- Private networks
        "172.16.", -- Private networks
    }
    
    for _, range in ipairs(blocked_ranges) do
        if string.match(client_ip, "^" .. range) then
            return false, "Blocked IP range"
        end
    end
    
    return true, "OK"
end

-- DDoS protection
local function check_ddos_protection(client_ip)
    local redis = get_redis_connection()
    if not redis then
        return true -- Fail open
    end
    
    local key = "ddos_protection:" .. client_ip
    local current_time = ngx.time()
    local window_start = current_time - 10 -- 10 second window
    
    -- Remove old entries
    redis:zremrangebyscore(key, 0, window_start)
    
    -- Count requests in last 10 seconds
    local recent_requests = redis:zcard(key)
    
    if recent_requests >= RATE_LIMIT_BURST then
        redis:close()
        -- Block IP for 1 hour if burst limit exceeded
        block_ip(client_ip, 3600)
        return false, "DDoS protection triggered"
    end
    
    -- Add current request
    redis:zadd(key, current_time, current_time .. ":" .. math.random(10000))
    redis:expire(key, 10)
    redis:close()
    
    return true, "OK"
end

-- Main security check function
function _M.security_check()
    local client_ip = ngx.var.remote_addr
    local request_method = ngx.req.get_method()
    local uri = ngx.var.uri
    
    -- Check if IP is blocked
    if is_ip_blocked(client_ip) then
        ngx.log(ngx.WARN, "Blocked IP attempted access: ", client_ip)
        return false, "IP blocked due to suspicious activity"
    end
    
    -- Geographic restrictions
    local geo_ok, geo_message = check_geo_restrictions(client_ip)
    if not geo_ok then
        block_ip(client_ip, 3600)
        return false, geo_message
    end
    
    -- DDoS protection
    local ddos_ok, ddos_message = check_ddos_protection(client_ip)
    if not ddos_ok then
        return false, ddos_message
    end
    
    -- Rate limiting
    local rate_ok, rate_message = check_rate_limit(client_ip)
    if not rate_ok then
        ngx.log(ngx.WARN, "Rate limit exceeded for IP: ", client_ip)
        return false, rate_message
    end
    
    -- Check suspicious headers
    local header_ok, header_message = check_suspicious_headers()
    if not header_ok then
        ngx.log(ngx.WARN, "Suspicious headers from IP: ", client_ip, " - ", header_message)
        block_ip(client_ip, 1800) -- Block for 30 minutes
        return false, "Suspicious request headers detected"
    end
    
    -- Check request body for POST/PUT requests
    if request_method == "POST" or request_method == "PUT" or request_method == "PATCH" then
        ngx.req.read_body()
        local body_data = ngx.req.get_body_data() or ""
        
        local pattern_ok, detected_pattern = check_suspicious_patterns(body_data)
        if pattern_ok then
            ngx.log(ngx.WARN, "Suspicious pattern detected from IP: ", client_ip, " - ", detected_pattern)
            block_ip(client_ip, 3600) -- Block for 1 hour
            return false, "Malicious request pattern detected"
        end
    end
    
    return true, "Security checks passed"
end

-- Add security headers
function _M.add_security_headers()
    ngx.header["X-Content-Type-Options"] = "nosniff"
    ngx.header["X-Frame-Options"] = "DENY"
    ngx.header["X-XSS-Protection"] = "1; mode=block"
    ngx.header["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    ngx.header["Content-Security-Policy"] = "default-src 'self'"
    ngx.header["Referrer-Policy"] = "strict-origin-when-cross-origin"
    ngx.header["X-Permitted-Cross-Domain-Policies"] = "none"
end

-- Log security events
function _M.log_security_event(event_type, details)
    local client_ip = ngx.var.remote_addr
    local user_agent = ngx.req.get_headers()["user-agent"] or ""
    local uri = ngx.var.uri
    
    local log_entry = {
        timestamp = ngx.time(),
        event_type = event_type,
        client_ip = client_ip,
        user_agent = user_agent,
        uri = uri,
        details = details
    }
    
    ngx.log(ngx.WARN, "SECURITY_EVENT: ", cjson.encode(log_entry))
    
    -- Also store in Redis for monitoring
    local redis = get_redis_connection()
    if redis then
        local key = "security_events:" .. ngx.time()
        redis:setex(key, 86400, cjson.encode(log_entry)) -- Keep for 24 hours
        redis:close()
    end
end

-- Main execution function
function _M.execute()
    local success, message = _M.security_check()
    
    if not success then
        _M.log_security_event("SECURITY_BLOCK", message)
        
        ngx.status = 403
        ngx.header["Content-Type"] = "application/json"
        ngx.say(cjson.encode({
            success = false,
            error = "Access denied",
            code = "SECURITY_VIOLATION"
        }))
        ngx.exit(403)
    end
    
    -- Add security headers
    _M.add_security_headers()
    
    -- Continue to next phase
end

return _M