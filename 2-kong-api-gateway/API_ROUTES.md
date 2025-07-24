# Campus API Gateway 路由架构

> **Configuration File**: `kong-config.yml` - Unified Kong configuration
> **Lua Clients**: `kong-business-grpc.lua`, `kong-grpc-client.lua`

## 🏗️ 路由设计原则

1. **UI 路由** (`/ui/*`) - 通过中台聚合，使用 Cookie/Session 认证
2. **API 路由** (`/api/*`) - Kong Lua 直接处理或通过中台，使用 JWT 认证  
3. **健康检查** (`/health/*`) - 无需认证的服务状态检查

## 📡 API 路由分发策略

### 🎯 中台聚合路由
这些路由需要复杂的业务逻辑聚合，通过 middle-platform 处理：

```
/ui/business/summary     → middleware-service → business-service (gRPC) + analytics-service
/ui/analytics/summary    → middleware-service → analytics-service + business-service (gRPC)  
/ui/campus-auth/*        → middleware-service → MongoDB (用户认证)
/api/campus-auth/*        → middleware-service → MongoDB (用户认证)
```

### 🎯 Kong Lua 直接处理路由
这些路由通过 Kong Lua 脚本直接处理，实现高性能访问：

```
/api/business/summary     → Kong Lua → business-service (gRPC模拟)
/api/analytics/summary    → Kong Lua → analytics-service + business-service (gRPC模拟)
```

### 🎯 直接后端路由
这些路由可以直接访问后端服务，减少中间层开销：

#### Analytics Service (直接 HTTP)
```
/api/analytics/dashboard  → analytics-service:8001
/api/analytics/query      → analytics-service:8001
/api/analytics/export     → analytics-service:8001
/api/analytics/report     → analytics-service:8001
/api/data/events          → analytics-service:8001
```

## 🔐 认证策略

### UI 路由认证
- 使用 Kong Session Plugin
- Cookie-based 认证
- 用户上下文通过 Headers 传递

### API 路由认证  
- JWT Token 认证
- 用户信息从 JWT payload 提取
- 统一注入 User Context Headers

## 📊 数据流架构

### 典型请求流程

#### 1. UI 请求 (聚合数据)
```
Frontend → Kong → middleware-service → {
  gRPC → business-service → MySQL
  HTTP → analytics-service → MongoDB
}
```

#### 2. API 请求 (直接访问)
```
Frontend/Mobile → Kong → {
  gRPC Gateway → business-service → MySQL
  HTTP → analytics-service → MongoDB
}
```

#### 3. 混合请求 (复杂聚合)
```
Frontend → Kong → middleware-service → {
  gRPC → business-service → MySQL
  HTTP → analytics-service → MongoDB
  聚合处理 → 统一响应
}
```

## 🛠️ 服务端口配置

| 服务 | 协议 | 端口 | 用途 |
|------|------|------|------|
| middleware-service | HTTP | 3001 | 中台聚合服务 |
| business-service | gRPC | 9090 | 业务数据服务 |
| analytics-service | HTTP | 8001 | 数据分析服务 |
| Kong Gateway | HTTP | 8000 | API 网关 |

## 🔍 路由优先级

Kong 按以下优先级匹配路由：

1. **精确路径匹配** - `/api/business/summary`
2. **前缀匹配** - `/api/analytics/*`
3. **通配符匹配** - `/ui/*`
4. **默认路由** - 其他请求

## 📝 Headers 传递

### 用户上下文 Headers
所有认证后的请求都会注入以下 Headers：

```
X-User-ID: 用户ID
X-User-Role: 用户角色 (student/teacher/admin)
X-User-Name: 用户姓名
X-User-Email: 用户邮箱
X-Kong-Authenticated: true
```

### 请求追踪 Headers
```
X-Request-ID: 请求唯一标识
X-Correlation-ID: 关联请求标识
X-Kong-Gateway: campus-api-gateway
X-API-Version: v1.0
```

## 🚀 性能优化

### 路由级优化
- **直接路由**: 简单CRUD操作直接访问后端
- **聚合路由**: 复杂业务逻辑通过中台处理
- **缓存策略**: Kong级别缓存常用数据

### 负载均衡
- business-service: gRPC 负载均衡
- analytics-service: HTTP 负载均衡  
- middleware-service: 中台服务负载均衡

## 🔧 开发和调试

### 开发路由
```
/dev/api/*  → middleware-service (需要 API Key)
```

### 健康检查
```
/health/middleware  → middleware-service
/health/business    → business-service  
/health/analytics   → analytics-service
```

## 📈 监控和日志

- **Prometheus**: 指标收集
- **Request ID**: 请求追踪
- **Rate Limiting**: 流量控制
- **Lua Logging**: 自定义日志记录

---

这种架构设计实现了：
✅ 灵活的路由分发
✅ 高效的直接访问
✅ 复杂的聚合处理
✅ 统一的认证管理
✅ 完整的监控体系