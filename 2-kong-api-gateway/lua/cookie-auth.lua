-- Cookie-based Authentication Lua Script for Kong
-- This script validates session cookies for /ui/* routes

local jwt = require "resty.jwt"
local cjson = require "cjson"

local _M = {}

-- Configuration
local COOKIE_NAME = "connect.sid"
local SESSION_SECRET = os.getenv("SESSION_SECRET") or "your-session-secret-key"
local NODEJS_SERVICE_URL = os.getenv("NODEJS_SERVICE_URL") or "http://nodejs:3001"

-- Helper function to parse cookies
local function parse_cookies(cookie_header)
    local cookies = {}
    if not cookie_header then
        return cookies
    end
    
    for pair in string.gmatch(cookie_header, "([^;]+)") do
        local key, value = string.match(pair, "^%s*(.-)%s*=%s*(.-)%s*$")
        if key and value then
            cookies[key] = value
        end
    end
    return cookies
end

-- Helper function to decode session cookie
local function decode_session_cookie(cookie_value)
    if not cookie_value then
        return nil
    end
    
    -- Remove 's:' prefix if present (express-session format)
    local session_data = string.match(cookie_value, "^s:(.+)")
    if not session_data then
        session_data = cookie_value
    end
    
    -- Basic session decoding (this is simplified)
    -- In production, you'd want proper session signature verification
    local decoded = ngx.decode_base64(session_data)
    if decoded then
        local success, session = pcall(cjson.decode, decoded)
        if success then
            return session
        end
    end
    
    return nil
end

-- Validate session by calling Node.js service
local function validate_session_with_nodejs(session_id)
    local httpc = require("resty.http").new()
    
    local res, err = httpc:request_uri(NODEJS_SERVICE_URL .. "/ui/auth/check", {
        method = "GET",
        headers = {
            ["Cookie"] = COOKIE_NAME .. "=" .. session_id,
            ["Content-Type"] = "application/json"
        }
    })
    
    if not res then
        ngx.log(ngx.ERR, "Failed to validate session: ", err)
        return false, nil
    end
    
    if res.status == 200 then
        local success, user_data = pcall(cjson.decode, res.body)
        if success and user_data.success then
            return true, user_data.user
        end
    end
    
    return false, nil
end

-- Main authentication function
function _M.authenticate()
    local headers = ngx.req.get_headers()
    local cookie_header = headers["cookie"]
    
    if not cookie_header then
        ngx.log(ngx.INFO, "No cookie header found")
        return false, "Missing authentication cookie"
    end
    
    local cookies = parse_cookies(cookie_header)
    local session_cookie = cookies[COOKIE_NAME]
    
    if not session_cookie then
        ngx.log(ngx.INFO, "Session cookie not found")
        return false, "Invalid session cookie"
    end
    
    -- Validate session with Node.js service
    local is_valid, user_data = validate_session_with_nodejs(session_cookie)
    
    if not is_valid then
        ngx.log(ngx.INFO, "Session validation failed")
        return false, "Invalid or expired session"
    end
    
    -- Add user information to headers for downstream services
    if user_data then
        ngx.req.set_header("X-User-ID", user_data.id or "")
        ngx.req.set_header("X-Username", user_data.username or "")
        ngx.req.set_header("X-Auth-Method", "cookie")
    end
    
    ngx.log(ngx.INFO, "Cookie authentication successful for user: ", user_data.username or "unknown")
    return true, "Authentication successful"
end

-- Rate limiting for failed attempts
local function check_rate_limit(client_ip)
    local limit_key = "cookie_auth_fail:" .. client_ip
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
    
    if attempts >= 5 then
        ngx.log(ngx.WARN, "Rate limit exceeded for IP: ", client_ip)
        return false
    end
    
    -- Increment counter
    redis:incr(limit_key)
    redis:expire(limit_key, 300) -- 5 minutes
    redis:close()
    
    return true
end

-- Main execution
function _M.execute()
    local client_ip = ngx.var.remote_addr
    
    -- Check rate limiting
    if not check_rate_limit(client_ip) then
        ngx.status = 429
        ngx.header["Content-Type"] = "application/json"
        ngx.say(cjson.encode({
            success = false,
            error = "Too many failed authentication attempts",
            code = "RATE_LIMITED"
        }))
        ngx.exit(429)
    end
    
    local success, message = _M.authenticate()
    
    if not success then
        ngx.status = 401
        ngx.header["Content-Type"] = "application/json"
        ngx.say(cjson.encode({
            success = false,
            error = message,
            code = "AUTHENTICATION_FAILED"
        }))
        ngx.exit(401)
    end
    
    -- Authentication successful, continue to upstream
end

return _M