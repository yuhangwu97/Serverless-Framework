-- Custom Authentication Plugin Handler for Kong
-- This plugin orchestrates different authentication methods based on route prefix

local BasePlugin = require "kong.plugins.base_plugin"
local responses = require "kong.tools.responses"

local CustomAuthHandler = BasePlugin:extend()

CustomAuthHandler.PRIORITY = 1000 -- Run before most other plugins
CustomAuthHandler.VERSION = "1.0.0"

function CustomAuthHandler:new()
  CustomAuthHandler.super.new(self, "custom-auth")
end

function CustomAuthHandler:access(conf)
  CustomAuthHandler.super.access(self)
  
  local uri = ngx.var.uri
  
  -- Load security module first
  local security = require("security")
  security.execute()
  
  -- Determine authentication method based on route prefix
  if string.match(uri, "^/ui/") then
    -- Use cookie-based authentication for /ui/* routes
    local cookie_auth = require("cookie-auth")
    cookie_auth.execute()
    
  elseif string.match(uri, "^/api/") then
    -- Use JWT authentication for /api/* routes
    local jwt_auth = require("jwt-auth")
    jwt_auth.execute()
    
  else
    -- For other routes, allow but log
    ngx.log(ngx.INFO, "Unmatched route accessed: ", uri)
  end
end

function CustomAuthHandler:header_filter(conf)
  CustomAuthHandler.super.header_filter(self)
  
  -- Add custom headers to response
  ngx.header["X-Gateway"] = "Kong-Custom-Auth"
  ngx.header["X-Request-ID"] = ngx.var.request_id or "unknown"
end

function CustomAuthHandler:log(conf)
  CustomAuthHandler.super.log(self)
  
  -- Log access patterns for monitoring
  local uri = ngx.var.uri
  local method = ngx.req.get_method()
  local status = ngx.status
  local user_id = ngx.req.get_headers()["X-User-ID"] or "anonymous"
  
  ngx.log(ngx.INFO, string.format("ACCESS_LOG: user_id=%s method=%s uri=%s status=%d", 
    user_id, method, uri, status))
end

return CustomAuthHandler