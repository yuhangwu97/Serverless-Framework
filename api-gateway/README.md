# API Gateway Configuration - Kong智能路由网关
# Kong Intelligent Routing Gateway

[中文版本](#中文版本) | [English Version](#english-version)

---

## 中文版本

### 🎯 Kong API Gateway 概述

Kong API Gateway是校园管理系统的核心路由组件，采用**智能路由分发策略**，根据不同的请求类型、性能需求和业务场景，实现精细化的流量控制和服务治理。

### 📁 文件结构

```
api-gateway/
├── kong-config.yml              # 🎯 统一Kong配置文件 (核心)
├── kong-business-grpc.lua       # 业务服务gRPC客户端 (Kong Lua)
├── kong-grpc-client.lua         # 通用gRPC客户端库
├── test-api-business-summary.sh # API端点测试脚本
├── README.md                    # 本文档
├── API_ROUTES.md               # 详细路由配置文档
├── archive/                    # 历史配置文件存档
├── lua/                        # 额外Lua脚本
├── plugins/                    # 自定义Kong插件
└── protos/                     # Protocol Buffer定义文件
```

### 🎯 智能路由分发策略

#### 1. 路由分发决策矩阵

```yaml
路由分发决策流程:
┌─────────────────────┬──────────────────┬──────────────────┬─────────────────┐
│ 请求路径             │ 处理策略          │ 认证方式          │ 性能特点         │
├─────────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ /ui/business/summary│ 中台聚合          │ Cookie/Session   │ 复杂业务逻辑     │
│ /ui/analytics/summary│ 中台聚合         │ Cookie/Session   │ 多服务数据聚合   │
│ /ui/campus-auth/*   │ 中台认证          │ Cookie/Session   │ 用户友好体验     │
│ /ui/user            │ 中台处理          │ Cookie/Session   │ 页面渲染优化     │
├─────────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ /api/business/summary│ Kong Lua直接处理 │ JWT Token        │ 超低延迟         │
│ /api/analytics/summary│ 中台聚合        │ JWT Token        │ 业务数据聚合     │
│ /api/campus-auth/*  │ 中台认证          │ JWT Token        │ 统一认证管理     │
│ /api/analytics/dashboard│ 直接服务访问  │ JWT Token        │ 高吞吐量         │
│ /api/analytics/query│ 直接服务访问      │ JWT Token        │ 实时查询         │
└─────────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

#### 2. Kong Lua脚本处理流程

```lua
-- 智能路由分发核心算法
function intelligent_routing(request)
    local path = request.path
    local method = request.method
    local auth_header = request.headers.authorization
    
    -- 路径匹配和策略选择
    if string.match(path, "^/ui/") then
        return {
            strategy = "middleware_aggregation",
            service = "middleware-service",
            auth_type = "cookie_session",
            processing_mode = "complex_business_logic",
            expected_latency = "200-500ms",
            cache_strategy = "short_term"
        }
    elseif string.match(path, "^/api/business/summary") then
        return {
            strategy = "kong_lua_direct",
            service = "business-service-grpc", 
            auth_type = "jwt_token",
            processing_mode = "direct_grpc_call",
            expected_latency = "10-50ms",
            cache_strategy = "aggressive"
        }
    elseif string.match(path, "^/api/analytics/dashboard") then
        return {
            strategy = "service_passthrough",
            service = "analytics-service",
            auth_type = "jwt_token", 
            processing_mode = "direct_http_proxy",
            expected_latency = "50-150ms",
            cache_strategy = "conditional"
        }
    end
end
```

### 🏗️ Kong配置架构详解

#### 1. 服务定义 (Services)

```yaml
# 中台聚合服务
middleware-service:
  URL: http://middleware-service:3001
  作用: 复杂业务逻辑聚合、多服务数据整合
  特点: 
    - 支持gRPC和HTTP混合调用
    - 统一错误处理和重试机制
    - 数据格式标准化
    - 用户认证和权限管理
  CORS配置:
    - 支持跨域请求
    - 允许认证信息传递
    - 预检请求优化

# 分析服务
analytics-service:
  URL: http://analytics-service:8001
  作用: 数据分析、报表生成、事件追踪
  特点:
    - 高性能数据查询
    - 实时分析能力
    - 多格式数据导出
    - 事件流处理
```

#### 2. 路由规则 (Routes)

```yaml
# UI路由组 - 复杂聚合策略
ui-aggregated-routes:
  路径: ["/ui/business/summary", "/ui/analytics/summary"]
  处理策略: 
    - 通过middleware-service进行数据聚合
    - 并行调用多个后端服务
    - 统一响应格式和错误处理
  认证插件: Session + Cookie
  特点:
    - 用户体验优先
    - 复杂业务逻辑处理
    - 多服务数据整合

# API路由组 - 高性能直达策略  
api-business-summary:
  路径: ["/api/business/summary"]
  处理策略:
    - Kong Lua脚本直接处理
    - 绕过中间件层
    - 直接调用业务服务gRPC
  认证插件: JWT Token
  特点:
    - 超低延迟响应
    - 高并发处理能力
    - 最小化中间层开销

api-analytics-direct:
  路径: ["/api/analytics/dashboard", "/api/analytics/query"]
  处理策略:
    - 直接透传到analytics-service
    - 移除认证头信息
    - 注入用户上下文
  认证插件: JWT Token
  特点:
    - 接近原生性能
    - 实时数据查询
    - 高吞吐量处理
```

#### 3. 全局插件配置 (Global Plugins)

```yaml
# 请求追踪
request-id:
  功能: 为每个请求生成唯一标识
  用途: 分布式追踪、日志关联、问题定位
  配置: 
    - 头部名称: X-Request-ID
    - 下游回显: 启用

correlation-id:
  功能: 关联请求标识符
  用途: 跨服务请求关联、业务流程追踪
  配置:
    - 头部名称: X-Correlation-ID
    - 请求链路追踪: 启用

# 限流和熔断
rate-limiting:
  策略: 本地限流
  配置:
    - 每分钟: 200次请求
    - 每小时: 2000次请求  
    - 每天: 10000次请求
  特点:
    - 防止服务过载
    - 保护后端服务
    - 公平资源分配

# 监控和观测
prometheus:
  功能: 指标收集和暴露
  配置:
    - 按消费者统计: 启用
    - 详细指标: 启用
  指标类型:
    - 请求计数
    - 响应时间
    - 错误率统计
    - 带宽使用量

# 安全策略
security-headers:
  功能: 注入安全响应头
  配置:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - X-Kong-Gateway: campus-api-gateway
```

### 🔐 认证和授权体系

#### 1. 双重认证机制

```yaml
# UI路由认证 - Cookie/Session
session-authentication:
  认证流程:
    1. 用户通过/ui/campus-auth/*登录
    2. 生成服务端Session
    3. 设置HttpOnly Cookie
    4. 后续请求自动携带认证信息
  
  配置参数:
    - 存储方式: Cookie
    - 密钥: your-session-secret-key
    - Cookie名称: campus_session
    - 安全设置: HttpOnly + SameSite
  
  优势:
    - 用户体验友好，无需手动管理Token
    - 自动过期和续期
    - CSRF攻击防护
    - 浏览器环境兼容性好

# API路由认证 - JWT Token  
jwt-authentication:
  认证流程:
    1. 客户端通过/api/campus-auth/*获取Token
    2. 后续请求在Authorization头中携带Bearer Token
    3. Kong验证Token有效性和过期时间
    4. 提取用户信息注入到请求头
  
  配置参数:
    - 密钥: your-jwt-secret-key
    - 验证声明: exp (过期时间)
    - 用户标识: userId
    - 最大有效期: 86400秒 (24小时)
  
  优势:
    - 无状态设计，适合分布式架构
    - 跨域友好，支持移动端
    - 高性能，无需服务端存储
    - 微服务架构兼容性好
```

#### 2. 用户上下文注入

```yaml
# 统一用户上下文Headers
user-context-injection:
  注入Headers:
    - X-User-ID: 用户唯一标识
    - X-User-Role: 用户角色 (student/teacher/admin)
    - X-User-Name: 用户姓名
    - X-User-Email: 用户邮箱
    - X-Kong-Authenticated: 认证状态标识
  
  权限级别:
    - read: 读取权限 (学生、教师、管理员)
    - write: 写入权限 (教师、管理员)
    - manage: 管理权限 (管理员)
  
  角色权限矩阵:
    - student: 查看个人数据、课程信息、成绩记录
    - teacher: 学生权限 + 课程管理、成绩录入
    - admin: 教师权限 + 用户管理、系统配置
```

### 📊 性能优化和监控

#### 1. 缓存策略

```yaml
# 多层缓存策略
cache-strategy:
  Kong层缓存:
    - 静态配置: 长期缓存 (1小时)
    - 用户信息: 中期缓存 (15分钟)
    - 动态数据: 短期缓存 (1分钟)
  
  应用层缓存:
    - Redis: 热点数据、用户会话
    - 内存缓存: 配置数据、权限信息
  
  缓存失效策略:
    - TTL自动过期
    - 手动清除机制
    - 版本标识更新
```

#### 2. 负载均衡

```yaml
# 服务负载均衡
load-balancing:
  middleware-service:
    - 算法: 轮询 (Round Robin)
    - 健康检查: HTTP /health
    - 故障转移: 自动
    - 权重配置: 均匀分布
  
  analytics-service:
    - 算法: 最少连接 (Least Connections)
    - 健康检查: HTTP /health/analytics
    - 超时配置: 5秒
    - 重试策略: 指数退避
```

#### 3. 监控指标

```yaml
# 关键性能指标 (KPIs)
performance-metrics:
  请求指标:
    - QPS: 每秒查询数
    - 平均响应时间: <100ms (API), <500ms (UI)
    - 95分位延迟: <200ms (API), <1s (UI)
    - 错误率: <0.1%
  
  资源指标:
    - CPU使用率: <70%
    - 内存使用率: <80%
    - 网络带宽: 监控峰值
    - 连接数: 活跃连接监控
  
  业务指标:
    - 用户活跃度: DAU/MAU
    - 功能使用率: 按模块统计
    - 错误分布: 按服务和路由分析
```

### 🚀 部署和配置

#### 1. Docker集成

```yaml
# Docker容器配置
docker-integration:
  Kong容器:
    - 镜像: kong/kong-gateway:3.4
    - 环境变量: 数据库、插件、日志配置
    - 网络: microservice-network
    - 数据卷: 配置文件、Lua脚本挂载
  
  配置文件挂载:
    - kong-config.yml: 主配置文件
    - kong-business-grpc.lua: 业务gRPC客户端
    - kong-grpc-client.lua: 通用gRPC库
  
  网络配置:
    - 服务发现: Docker DNS
    - 负载均衡: Kong内置
    - 健康检查: 自动检测
```

#### 2. 环境变量配置

```yaml
# Kong环境变量
environment-variables:
  KONG_DATABASE: postgres
  KONG_PG_HOST: kong-database
  KONG_PG_USER: kong
  KONG_PG_PASSWORD: kong
  KONG_PG_DATABASE: kong
  KONG_PLUGINS: bundled,cors,jwt,rate-limiting,request-id,correlation-id,prometheus
  KONG_LUA_PACKAGE_PATH: /usr/local/share/lua/5.1/?.lua;/etc/kong/?.lua;;
```

### 🔍 故障排查和调试

#### 1. 常见问题和解决方案

```yaml
# 故障排查指南
troubleshooting:
  Kong启动失败:
    - 检查: YAML语法错误
    - 验证: 数据库连接
    - 确认: 插件配置正确
    - 日志: 查看启动日志
  
  路由不工作:
    - 检查: 服务定义是否正确
    - 验证: 路径匹配规则
    - 确认: 服务是否可达
    - 测试: 健康检查端点
  
  Lua脚本错误:
    - 检查: 脚本语法
    - 验证: 依赖库是否存在
    - 确认: 脚本权限
    - 调试: 添加日志输出
  
  JWT认证失败:
    - 检查: Token格式
    - 验证: 密钥配置
    - 确认: 过期时间
    - 测试: 手动验证Token
```

#### 2. 调试命令

```bash
# Kong状态检查
curl http://localhost:8002/status

# 配置验证
deck diff --kong-addr http://localhost:8001 --state kong-config.yml

# 服务连通性测试
docker exec kong-container ping middleware-service

# 日志查看
docker logs kong-container -f

# 插件状态
curl http://localhost:8001/plugins

# 路由列表
curl http://localhost:8001/routes
```

### 🧪 测试和验证

#### 1. 自动化测试

```bash
# API端点测试
./test-api-business-summary.sh

# 健康检查测试
curl http://localhost:8000/health/middleware
curl http://localhost:8000/health/analytics

# 认证测试
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:8000/api/business/summary

# 性能测试
ab -n 1000 -c 10 http://localhost:8000/api/business/summary
wrk -t4 -c100 -d30s http://localhost:8000/ui/business/summary
```

#### 2. 测试场景

```yaml
# 测试用例覆盖
test-scenarios:
  功能测试:
    - 路由分发正确性
    - 认证授权机制
    - 错误处理能力
    - 数据格式验证
  
  性能测试:
    - 并发请求处理
    - 响应时间测试
    - 内存泄漏检测
    - 长连接稳定性
  
  安全测试:
    - 认证绕过尝试
    - 注入攻击防护
    - 敏感信息泄露
    - 权限提升检测
  
  集成测试:
    - 服务间通信
    - 数据库连接
    - 缓存一致性
    - 故障恢复能力
```

---

## English Version

### 🎯 Kong API Gateway Overview

Kong API Gateway is the core routing component of the Campus Management System, employing **intelligent routing distribution strategies** to achieve fine-grained traffic control and service governance based on different request types, performance requirements, and business scenarios.

### 📁 File Structure

```
api-gateway/
├── kong-config.yml              # 🎯 Unified Kong Configuration (Core)
├── kong-business-grpc.lua       # Business Service gRPC Client (Kong Lua)
├── kong-grpc-client.lua         # Generic gRPC Client Library
├── test-api-business-summary.sh # API Endpoint Testing Script
├── README.md                    # This Document
├── API_ROUTES.md               # Detailed Routing Configuration
├── archive/                    # Historical Configuration Archive
├── lua/                        # Additional Lua Scripts
├── plugins/                    # Custom Kong Plugins
└── protos/                     # Protocol Buffer Definition Files
```

### 🎯 Intelligent Routing Distribution Strategy

#### 1. Routing Decision Matrix

```yaml
Routing Decision Flow:
┌─────────────────────┬──────────────────┬──────────────────┬─────────────────┐
│ Request Path        │ Processing       │ Authentication   │ Performance     │
│                     │ Strategy         │ Method           │ Characteristics │
├─────────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ /ui/business/summary│ Middleware       │ Cookie/Session   │ Complex Business│
│                     │ Aggregation      │                  │ Logic           │
│ /ui/analytics/summary│ Middleware      │ Cookie/Session   │ Multi-service   │
│                     │ Aggregation      │                  │ Data Aggregation│
│ /ui/campus-auth/*   │ Middleware Auth  │ Cookie/Session   │ User-friendly   │
│ /ui/user            │ Middleware       │ Cookie/Session   │ Page Rendering  │
│                     │ Processing       │                  │ Optimization    │
├─────────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ /api/business/summary│ Kong Lua Direct │ JWT Token        │ Ultra-low       │
│                     │ Processing       │                  │ Latency         │
│ /api/analytics/summary│ Middleware     │ JWT Token        │ Business Data   │
│                     │ Aggregation      │                  │ Aggregation     │
│ /api/campus-auth/*  │ Middleware Auth  │ JWT Token        │ Unified Auth    │
│ /api/analytics/dashboard│ Direct Service│ JWT Token       │ High Throughput │
│                     │ Access           │                  │                 │
│ /api/analytics/query│ Direct Service   │ JWT Token        │ Real-time Query │
│                     │ Access           │                  │                 │
└─────────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

#### 2. Kong Lua Script Processing Flow

```lua
-- Intelligent Routing Distribution Core Algorithm
function intelligent_routing(request)
    local path = request.path
    local method = request.method
    local auth_header = request.headers.authorization
    
    -- Path matching and strategy selection
    if string.match(path, "^/ui/") then
        return {
            strategy = "middleware_aggregation",
            service = "middleware-service",
            auth_type = "cookie_session",
            processing_mode = "complex_business_logic",
            expected_latency = "200-500ms",
            cache_strategy = "short_term"
        }
    elseif string.match(path, "^/api/business/summary") then
        return {
            strategy = "kong_lua_direct",
            service = "business-service-grpc", 
            auth_type = "jwt_token",
            processing_mode = "direct_grpc_call",
            expected_latency = "10-50ms",
            cache_strategy = "aggressive"
        }
    elseif string.match(path, "^/api/analytics/dashboard") then
        return {
            strategy = "service_passthrough",
            service = "analytics-service",
            auth_type = "jwt_token", 
            processing_mode = "direct_http_proxy",
            expected_latency = "50-150ms",
            cache_strategy = "conditional"
        }
    end
end
```

### 🏗️ Detailed Kong Configuration Architecture

#### 1. Service Definitions

```yaml
# Middleware Aggregation Service
middleware-service:
  URL: http://middleware-service:3001
  Purpose: Complex business logic aggregation, multi-service data integration
  Features: 
    - Supports mixed gRPC and HTTP calls
    - Unified error handling and retry mechanisms
    - Data format standardization
    - User authentication and permission management
  CORS Configuration:
    - Cross-origin request support
    - Authentication information passing
    - Preflight request optimization

# Analytics Service
analytics-service:
  URL: http://analytics-service:8001
  Purpose: Data analysis, report generation, event tracking
  Features:
    - High-performance data queries
    - Real-time analysis capabilities
    - Multi-format data export
    - Event stream processing
```

#### 2. Route Rules

```yaml
# UI Route Group - Complex Aggregation Strategy
ui-aggregated-routes:
  Paths: ["/ui/business/summary", "/ui/analytics/summary"]
  Processing Strategy: 
    - Data aggregation through middleware-service
    - Parallel backend service calls
    - Unified response format and error handling
  Authentication Plugin: Session + Cookie
  Features:
    - User experience priority
    - Complex business logic processing
    - Multi-service data integration

# API Route Group - High-Performance Direct Strategy  
api-business-summary:
  Paths: ["/api/business/summary"]
  Processing Strategy:
    - Direct Kong Lua script processing
    - Bypass middleware layer
    - Direct business service gRPC calls
  Authentication Plugin: JWT Token
  Features:
    - Ultra-low latency response
    - High concurrency processing capability
    - Minimal middleware overhead

api-analytics-direct:
  Paths: ["/api/analytics/dashboard", "/api/analytics/query"]
  Processing Strategy:
    - Direct passthrough to analytics-service
    - Remove authentication headers
    - Inject user context
  Authentication Plugin: JWT Token
  Features:
    - Near-native performance
    - Real-time data queries
    - High throughput processing
```

### 🔐 Authentication and Authorization System

#### 1. Dual Authentication Mechanism

```yaml
# UI Route Authentication - Cookie/Session
session-authentication:
  Authentication Flow:
    1. User login through /ui/campus-auth/*
    2. Generate server-side Session
    3. Set HttpOnly Cookie
    4. Subsequent requests automatically carry authentication info
  
  Configuration Parameters:
    - Storage Method: Cookie
    - Secret Key: your-session-secret-key
    - Cookie Name: campus_session
    - Security Settings: HttpOnly + SameSite
  
  Advantages:
    - User-friendly experience, no manual Token management
    - Automatic expiration and renewal
    - CSRF attack protection
    - Good browser environment compatibility

# API Route Authentication - JWT Token  
jwt-authentication:
  Authentication Flow:
    1. Client obtains Token through /api/campus-auth/*
    2. Subsequent requests carry Bearer Token in Authorization header
    3. Kong validates Token validity and expiration
    4. Extract user info and inject into request headers
  
  Configuration Parameters:
    - Secret Key: your-jwt-secret-key
    - Verify Claims: exp (expiration time)
    - User Identifier: userId
    - Maximum Validity: 86400 seconds (24 hours)
  
  Advantages:
    - Stateless design, suitable for distributed architecture
    - Cross-domain friendly, supports mobile clients
    - High performance, no server-side storage required
    - Good microservices architecture compatibility
```

### 📊 Performance Optimization and Monitoring

#### 1. Caching Strategy

```yaml
# Multi-layer Caching Strategy
cache-strategy:
  Kong Layer Cache:
    - Static Configuration: Long-term cache (1 hour)
    - User Information: Medium-term cache (15 minutes)
    - Dynamic Data: Short-term cache (1 minute)
  
  Application Layer Cache:
    - Redis: Hot data, user sessions
    - Memory Cache: Configuration data, permission info
  
  Cache Invalidation Strategy:
    - TTL automatic expiration
    - Manual clearing mechanism
    - Version identifier updates
```

#### 2. Load Balancing

```yaml
# Service Load Balancing
load-balancing:
  middleware-service:
    - Algorithm: Round Robin
    - Health Check: HTTP /health
    - Failover: Automatic
    - Weight Configuration: Even distribution
  
  analytics-service:
    - Algorithm: Least Connections
    - Health Check: HTTP /health/analytics
    - Timeout Configuration: 5 seconds
    - Retry Strategy: Exponential backoff
```

### 🚀 Deployment and Configuration

#### 1. Docker Integration

```yaml
# Docker Container Configuration
docker-integration:
  Kong Container:
    - Image: kong/kong-gateway:3.4
    - Environment Variables: Database, plugins, logging config
    - Network: microservice-network
    - Volumes: Configuration files, Lua scripts mounting
  
  Configuration File Mounting:
    - kong-config.yml: Main configuration file
    - kong-business-grpc.lua: Business gRPC client
    - kong-grpc-client.lua: Generic gRPC library
  
  Network Configuration:
    - Service Discovery: Docker DNS
    - Load Balancing: Kong built-in
    - Health Checks: Automatic detection
```

### 🔍 Troubleshooting and Debugging

#### 1. Common Issues and Solutions

```yaml
# Troubleshooting Guide
troubleshooting:
  Kong Startup Failure:
    - Check: YAML syntax errors
    - Verify: Database connection
    - Confirm: Plugin configuration correctness
    - Logs: Check startup logs
  
  Routes Not Working:
    - Check: Service definitions correctness
    - Verify: Path matching rules
    - Confirm: Service reachability
    - Test: Health check endpoints
  
  Lua Script Errors:
    - Check: Script syntax
    - Verify: Dependency libraries exist
    - Confirm: Script permissions
    - Debug: Add log outputs
  
  JWT Authentication Failure:
    - Check: Token format
    - Verify: Secret key configuration
    - Confirm: Expiration time
    - Test: Manual Token verification
```

#### 2. Debug Commands

```bash
# Kong Status Check
curl http://localhost:8002/status

# Configuration Validation
deck diff --kong-addr http://localhost:8001 --state kong-config.yml

# Service Connectivity Test
docker exec kong-container ping middleware-service

# Log Viewing
docker logs kong-container -f

# Plugin Status
curl http://localhost:8001/plugins

# Route List
curl http://localhost:8001/routes
```

### 🧪 Testing and Validation

#### 1. Automated Testing

```bash
# API Endpoint Testing
./test-api-business-summary.sh

# Health Check Testing
curl http://localhost:8000/health/middleware
curl http://localhost:8000/health/analytics

# Authentication Testing
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:8000/api/business/summary

# Performance Testing
ab -n 1000 -c 10 http://localhost:8000/api/business/summary
wrk -t4 -c100 -d30s http://localhost:8000/ui/business/summary
```

### 📚 Related Documentation

- [Main Project README](../README.md) - Complete system architecture
- [API Routes Documentation](API_ROUTES.md) - Detailed routing guide
- [Docker Setup](../docker/README.md) - Container orchestration

This Kong API Gateway configuration provides intelligent routing, high-performance processing, and comprehensive service governance for the modern campus management system.