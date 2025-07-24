-- Kong gRPC Client Library for business-service
local grpc = require "resty.grpc"
local cjson = require "cjson"
local pb = require "pb"

local _M = {}

-- Initialize gRPC client
function _M.new(host, port)
  local client = grpc.new()
  if not client then
    return nil, "Failed to create gRPC client"
  end
  
  local ok, err = client:connect(host, port)
  if not ok then
    return nil, "Failed to connect to gRPC server: " .. (err or "unknown error")
  end
  
  return {
    client = client,
    host = host,
    port = port
  }
end

-- Call business-service GetBusinessData
function _M.get_business_data(grpc_client, user_id, page, limit)
  page = page or 1
  limit = limit or 10
  
  local request = {
    user_id = user_id,
    page = page,
    limit = limit
  }
  
  local ok, response = pcall(function()
    return grpc_client.client:call("business.BusinessService/GetBusinessData", request)
  end)
  
  if not ok then
    kong.log.err("gRPC call failed: ", response)
    return {
      success = false,
      error = "gRPC call failed: " .. tostring(response),
      data = nil
    }
  end
  
  if response and response.success then
    return {
      success = true,
      data = {
        records_count = response.total or 0,
        recent_records = response.records or {}
      }
    }
  else
    return {
      success = false,
      error = response.error or "Unknown gRPC error",
      data = nil
    }
  end
end

-- Call business-service GetBusinessSummary
function _M.get_business_summary(grpc_client, user_id)
  local request = {
    user_id = user_id
  }
  
  local ok, response = pcall(function()
    return grpc_client.client:call("business.BusinessService/GetBusinessSummary", request)
  end)
  
  if not ok then
    kong.log.err("gRPC GetBusinessSummary failed: ", response)
    return {
      success = false,
      error = "gRPC call failed: " .. tostring(response),
      data = nil
    }
  end
  
  if response and response.success then
    return {
      success = true,
      data = {
        total_courses = response.total_courses or 0,
        total_students = response.total_students or 0,
        active_enrollments = response.active_enrollments or 0,
        recent_activities = response.recent_activities or {}
      }
    }
  else
    return {
      success = false,
      error = response.error or "Unknown gRPC error",
      data = nil
    }
  end
end

-- Call business-service GetCampusAuth
function _M.get_campus_auth(grpc_client, user_id)
  local request = {
    user_id = user_id
  }
  
  local ok, response = pcall(function()
    return grpc_client.client:call("business.BusinessService/GetCampusAuth", request)
  end)
  
  if not ok then
    kong.log.err("gRPC GetCampusAuth failed: ", response)
    return {
      success = false,
      error = "gRPC call failed: " .. tostring(response),
      data = nil
    }
  end
  
  if response and response.success then
    return {
      success = true,
      data = {
        user_role = response.user_role or "student",
        permissions = response.permissions or {},
        campus_id = response.campus_id or ""
      }
    }
  else
    return {
      success = false,
      error = response.error or "Unknown gRPC error",
      data = nil
    }
  end
end

-- Close gRPC connection
function _M.close(grpc_client)
  if grpc_client and grpc_client.client then
    grpc_client.client:close()
  end
end

return _M