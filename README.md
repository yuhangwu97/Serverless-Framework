# Campus Management System - Serverless Microservices Architecture
# 校园管理系统 - 无服务器微服务架构

[中文版本](#中文版本) | [English Version](#english-version)

---

## 中文版本

### 🏗️ 系统架构概述

校园管理系统是一个基于微服务架构的现代化校园信息管理平台，采用**精细化路由分发策略**，实现了高性能、高可用的服务治理体系。系统通过Kong API Gateway实现智能路由分发，根据不同的请求类型和性能需求，采用不同的处理策略。

### 📊 核心架构图

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                用户入口层                                │
                    └─────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────────┐
                    │           React Frontend (Port 3000)                  │
                    │              • UI界面渲染                              │
                    │              • 用户交互处理                            │
                    │              • 前端状态管理                            │
                    └─────────────────────────┬─────────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────────┐
                    │        Kong API Gateway (Port 8000)                  │
                    │              🎯 智能路由分发中心                        │
                    │         ┌─────────────┬─────────────┐                │
                    │         │   UI路由     │   API路由    │                │
                    │         │  (聚合策略)   │  (性能策略)   │                │
                    │         └─────────────┴─────────────┘                │
                    └─────┬─────────────────────────────────────────┬─────┘
                          │                                         │
            ┌─────────────▼─────────────┐                 ┌────────▼────────┐
            │     UI流量处理路径          │                 │   API流量处理路径  │
            │    (复杂业务聚合)           │                 │   (高性能直达)     │
            └─────────────┬─────────────┘                 └────────┬────────┘
                          │                                         │
    ┌─────────────────────▼─────────────────────┐        ┌────────▼────────┐
    │    Middleware Service (Port 3001)         │        │   Kong Lua       │
    │           🔄 中台聚合服务                   │        │   Script Engine  │
    │    ┌─────────────────────────────────┐    │        │   🚀 直接处理     │
    │    │  • 多服务数据聚合                │    │        └────────┬────────┘
    │    │  • 复杂业务逻辑处理              │    │                 │
    │    │  • 用户认证与权限控制            │    │                 │
    │    │  • 数据格式统一化               │    │                 │
    │    └─────────────────────────────────┘    │                 │
    └─────┬─────────────────────┬───────────────┘                 │
          │                     │                                 │
          │                     │                                 │
    ┌─────▼─────┐         ┌─────▼─────┐                 ┌────────▼────────┐
    │   gRPC    │         │   HTTP    │                 │     gRPC        │
    │   调用     │         │   调用     │                 │   直接调用       │
    └─────┬─────┘         └─────┬─────┘                 └────────┬────────┘
          │                     │                                │
    ┌─────▼─────────────────────▼─────────────────────────────────▼─────┐
    │                      后端服务层                                  │
    └─────────────────────────────────────────────────────────────────┘
          │                     │                                │
    ┌─────▼─────┐         ┌─────▼─────┐                 ┌────────▼────────┐
    │ Business  │         │Analytics  │                 │   Business      │
    │ Service   │         │ Service   │                 │   Service       │
    │(gRPC 9090)│         │(HTTP 8001)│                 │  (gRPC 9090)    │
    │  🏢 业务   │         │  📊 分析   │                 │   🏢 业务        │
    └─────┬─────┘         └─────┬─────┘                 └────────┬────────┘
          │                     │                                │
    ┌─────▼─────┐         ┌─────▼─────┐                 ┌────────▼────────┐
    │   MySQL   │         │  MongoDB  │                 │     MySQL       │
    │(Port 3306)│         │(Port 27017│                 │   (Port 3306)   │
    │  🗄️ 业务   │         │  🗄️ 分析   │                 │    🗄️ 业务       │
    └───────────┘         └───────────┘                 └─────────────────┘
```

### 🎯 精细化路由分发策略

#### 1. UI路由分发 (`/ui/*`) - 复杂聚合策略
**设计理念**: UI界面通常需要展示来自多个后端服务的综合数据，因此采用中台聚合模式。

```
用户界面请求流程：
Browser → Kong Gateway → Middleware Service → 并行调用多个后端服务 → 数据聚合 → 返回UI

具体路由映射：
┌─────────────────────────┬──────────────────────────────────────────────┐
│ UI路由                   │ 处理流程                                      │
├─────────────────────────┼──────────────────────────────────────────────┤
│ /ui/business/summary    │ Kong → 中台 → Business(gRPC) + Analytics(HTTP)│
│ /ui/analytics/summary   │ Kong → 中台 → Analytics(HTTP) + Business(gRPC)│
│ /ui/campus-auth/*       │ Kong → 中台 → MongoDB (用户认证)              │
│ /ui/user                │ Kong → 中台 → 用户管理逻辑                     │
│ /ui/business            │ Kong → 中台 → 业务数据展示                     │
│ /ui/analytics           │ Kong → 中台 → 数据分析展示                     │
└─────────────────────────┴──────────────────────────────────────────────┘

认证方式：Cookie/Session
优势：
• 复杂业务逻辑集中处理
• 多服务数据智能聚合
• 统一的错误处理和重试机制
• 数据格式标准化
```

#### 2. API路由分发 (`/api/*`) - 高性能直达策略
**设计理念**: API调用通常要求低延迟、高吞吐，因此采用直接访问或Kong Lua处理模式。

```
API请求流程：
Client → Kong Gateway → 路由分发决策 → 直接处理/后端服务

精细化分发规则：
┌─────────────────────────┬──────────────────────────────────────────────┐
│ API路由                  │ 处理策略                                      │
├─────────────────────────┼──────────────────────────────────────────────┤
│ /api/business/summary   │ Kong Lua Script → Business Service (gRPC)   │
│ /api/analytics/summary  │ Kong → 中台 → Analytics + Business 聚合      │
│ /api/campus-auth/*      │ Kong → 中台 → MongoDB (用户认证)              │
│ /api/business/data      │ Kong → 中台 → Business Service (gRPC)        │
│ /api/analytics/dashboard│ Kong → Analytics Service (HTTP) 直接访问     │
│ /api/analytics/query    │ Kong → Analytics Service (HTTP) 直接访问     │
│ /api/analytics/export   │ Kong → Analytics Service (HTTP) 直接访问     │
└─────────────────────────┴──────────────────────────────────────────────┘

认证方式：JWT Token
优势：
• 超低延迟响应
• 高并发处理能力
• 减少中间层开销
• 直接服务访问
```

### 🔄 流量分发决策算法

#### Kong Gateway智能路由决策流程：

```lua
-- Kong Lua 路由决策伪代码
function route_decision(request_path, request_method, auth_type)
    -- 1. 路径匹配阶段
    if string.match(request_path, "^/ui/") then
        -- UI路由：复杂聚合策略
        return {
            strategy = "middleware_aggregation",
            service = "middleware-service",
            auth = "cookie_session",
            processing = "complex_aggregation"
        }
    elseif string.match(request_path, "^/api/business/summary") then
        -- 特殊API：Kong直接处理
        return {
            strategy = "kong_lua_direct",
            service = "business-service-grpc",
            auth = "jwt_token",
            processing = "lua_script_execution"
        }
    elseif string.match(request_path, "^/api/analytics/dashboard") then
        -- 分析API：直接访问
        return {
            strategy = "direct_service_access",
            service = "analytics-service",
            auth = "jwt_token", 
            processing = "passthrough"
        }
    elseif string.match(request_path, "^/api/") then
        -- 其他API：中台处理
        return {
            strategy = "middleware_processing",
            service = "middleware-service",
            auth = "jwt_token",
            processing = "business_logic"
        }
    end
end
```

### 🏢 服务架构详解

#### 1. Frontend Service (React)
```yaml
端口: 3000
技术栈: React 18 + TypeScript + Axios
主要职能:
  - 用户界面渲染和交互
  - 前端状态管理 (Redux/Context)
  - API调用封装和错误处理
  - 路由管理和页面导航
部署特点:
  - Docker容器化部署
  - Nginx静态文件服务
  - 支持热重载开发模式
```

#### 2. Kong API Gateway
```yaml
端口: 8000 (Gateway), 8002 (Admin)
技术栈: Kong Gateway 3.4 + Lua Scripts + PostgreSQL
核心功能:
  - 智能路由分发
  - 认证和授权管理
  - 限流和熔断
  - 监控和日志记录
  - CORS和安全策略
插件配置:
  - JWT Authentication
  - Rate Limiting (200/min, 2000/hour, 10000/day)
  - CORS处理
  - Prometheus监控
  - Request ID追踪
```

#### 3. Middleware Service (中台聚合服务)
```yaml
端口: 3001
技术栈: Node.js + Express + gRPC Client + Axios
核心职能:
  - 多服务数据聚合
  - 复杂业务逻辑处理
  - 用户认证和权限管理
  - 数据格式标准化
  - 错误处理和重试机制
聚合模式:
  - 并行调用多个后端服务
  - Promise.allSettled() 容错处理
  - 数据合并和格式化
  - 统一响应结构
服务依赖:
  - Business Service (gRPC)
  - Analytics Service (HTTP)
  - MongoDB (用户认证)
```

#### 4. Business Service (业务服务)
```yaml
端口: 9090 (gRPC)
技术栈: Go + gRPC + MySQL + GORM
业务领域:
  - 课程管理 (Course Management)
  - 学生选课 (Enrollment Management)  
  - 成绩管理 (Grade Management)
  - 业务记录 (Business Records)
  - 图书管理 (Library Management)
数据模型:
  - 用户信息 (Users)
  - 课程信息 (Courses)
  - 选课记录 (Enrollments)
  - 成绩记录 (Grades)
  - 业务操作日志 (Business Logs)
性能特点:
  - gRPC高性能通信
  - 连接池管理
  - 数据库事务处理
  - 缓存策略优化
```

#### 5. Analytics Service (分析服务)
```yaml
端口: 8001
技术栈: Python + FastAPI + MongoDB + Redis
分析功能:
  - 用户行为分析
  - 业务数据统计
  - 报表生成和导出
  - 实时数据监控
  - 事件追踪和分析
数据处理:
  - ETL数据处理管道
  - 实时流数据分析
  - 历史数据挖掘
  - 预测分析算法
存储策略:
  - MongoDB: 事件数据、分析结果
  - Redis: 实时计算缓存
  - 数据分区和索引优化
```

### 🗄️ 数据存储架构

#### 数据库分离策略
```yaml
MySQL (业务数据库):
  端口: 3306
  用途: 关系型业务数据存储
  数据类型:
    - 用户信息和权限
    - 课程和班级信息
    - 选课和成绩记录
    - 业务操作日志
  特点:
    - ACID事务支持
    - 复杂关系查询
    - 数据一致性保证

MongoDB (分析数据库):
  端口: 27017  
  用途: 文档型数据和分析数据
  数据类型:
    - 用户行为事件
    - 分析统计结果
    - 日志和监控数据
    - 非结构化数据
  特点:
    - 灵活的文档结构
    - 高性能读写
    - 水平扩展能力

Redis (缓存数据库):
  端口: 6379
  用途: 高速缓存和会话存储
  数据类型:
    - 用户会话信息
    - 热点数据缓存
    - 实时计算结果
    - 分布式锁
  特点:
    - 内存级别性能
    - 多种数据结构
    - 持久化策略
```

### 🔐 认证和授权体系

#### 双重认证策略
```yaml
UI路由认证 (Cookie/Session):
  认证流程:
    用户登录 → 生成Session → 写入Cookie → 后续请求自动携带
  优势:
    - 用户体验友好
    - 自动续期管理
    - CSRF防护
    - 适合浏览器环境
  
API路由认证 (JWT Token):
  认证流程:
    客户端认证 → 获取JWT Token → 请求头携带Bearer Token
  优势:
    - 无状态设计
    - 跨域友好
    - 移动端适配
    - 微服务架构友好
    
权限控制:
  用户角色:
    - student: 学生权限
    - teacher: 教师权限  
    - admin: 管理员权限
  权限级别:
    - read: 读取权限
    - write: 写入权限
    - manage: 管理权限
```

### 📊 监控和观测性

#### 多层次监控体系
```yaml
网关层监控:
  - Kong Prometheus插件
  - 请求QPS、延迟、错误率
  - 路由性能分析
  - 限流和熔断统计

应用层监控:
  - 服务健康检查端点
  - 业务指标监控
  - 错误日志聚合
  - 性能追踪分析

基础设施监控:
  - Docker容器监控
  - 数据库性能监控
  - 网络连接状态
  - 资源使用统计

日志管理:
  - 统一日志格式
  - 请求ID追踪
  - 关联日志查询
  - 错误告警机制
```

### 🚀 部署和运维

#### Docker容器化部署
```yaml
部署架构:
  - Docker Compose统一编排
  - 多环境配置管理
  - 容器健康检查
  - 自动重启策略

服务发现:
  - Docker网络互联
  - 服务名解析
  - 负载均衡配置
  - 故障自动转移

数据持久化:
  - Docker Volume管理
  - 数据备份策略
  - 灾难恢复方案
  - 数据迁移工具
```

### 🔄 开发和测试

#### 开发环境
```bash
# 启动完整开发环境
./docker-compose.sh up -d

# 单独开发前端
cd frontend && npm run dev

# 单独开发中台
cd middle-platform && npm run dev

# 单独开发后端服务
cd backend/business-service && go run main.go
cd backend/analytics-service && python main.py
```

#### 测试策略
```bash
# API测试
./api-gateway/test-api-business-summary.sh

# 健康检查
curl http://localhost:8000/health/middleware
curl http://localhost:8000/health/analytics

# 性能测试
ab -n 1000 -c 10 http://localhost:8000/api/business/summary
```

---

## English Version

### 🏗️ System Architecture Overview

The Campus Management System is a modern campus information management platform based on microservices architecture, employing **fine-grained routing distribution strategies** to achieve high-performance and high-availability service governance. The system implements intelligent routing distribution through Kong API Gateway, adopting different processing strategies based on different request types and performance requirements.

### 📊 Core Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                 User Entry Layer                        │
                    └─────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────────┐
                    │           React Frontend (Port 3000)                  │
                    │              • UI Rendering                           │
                    │              • User Interaction                       │
                    │              • Frontend State Management              │
                    └─────────────────────────┬─────────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────────┐
                    │        Kong API Gateway (Port 8000)                  │
                    │         🎯 Intelligent Routing Distribution Center     │
                    │         ┌─────────────┬─────────────┐                │
                    │         │  UI Routes  │ API Routes  │                │
                    │         │ (Aggregation│ (Performance│                │
                    │         │  Strategy)  │  Strategy)  │                │
                    │         └─────────────┴─────────────┘                │
                    └─────┬─────────────────────────────────────────┬─────┘
                          │                                         │
            ┌─────────────▼─────────────┐                 ┌────────▼────────┐
            │    UI Traffic Path         │                 │  API Traffic Path│
            │  (Complex Aggregation)     │                 │ (High Performance│
            └─────────────┬─────────────┘                 │   Direct Access) │
                          │                               └────────┬────────┘
    ┌─────────────────────▼─────────────────────┐                │
    │    Middleware Service (Port 3001)         │        ┌────────▼────────┐
    │       🔄 Platform Aggregation Service      │        │   Kong Lua       │
    │    ┌─────────────────────────────────┐    │        │   Script Engine  │
    │    │  • Multi-service Data Aggregation│    │        │   🚀 Direct      │
    │    │  • Complex Business Logic       │    │        │    Processing    │
    │    │  • User Auth & Permission Control│    │        └────────┬────────┘
    │    │  • Data Format Standardization  │    │                 │
    │    └─────────────────────────────────┘    │                 │
    └─────┬─────────────────────┬───────────────┘                 │
          │                     │                                 │
    ┌─────▼─────┐         ┌─────▼─────┐                 ┌────────▼────────┐
    │   gRPC    │         │   HTTP    │                 │     gRPC        │
    │   Call    │         │   Call    │                 │  Direct Call    │
    └─────┬─────┘         └─────┬─────┘                 └────────┬────────┘
          │                     │                                │
    ┌─────▼─────────────────────▼─────────────────────────────────▼─────┐
    │                    Backend Service Layer                         │
    └─────────────────────────────────────────────────────────────────┘
          │                     │                                │
    ┌─────▼─────┐         ┌─────▼─────┐                 ┌────────▼────────┐
    │ Business  │         │Analytics  │                 │   Business      │
    │ Service   │         │ Service   │                 │   Service       │
    │(gRPC 9090)│         │(HTTP 8001)│                 │  (gRPC 9090)    │
    │🏢 Business│         │📊 Analytics│                 │   🏢 Business   │
    └─────┬─────┘         └─────┬─────┘                 └────────┬────────┘
          │                     │                                │
    ┌─────▼─────┐         ┌─────▼─────┐                 ┌────────▼────────┐
    │   MySQL   │         │  MongoDB  │                 │     MySQL       │
    │(Port 3306)│         │(Port 27017│                 │   (Port 3306)   │
    │🗄️ Business│         │🗄️ Analytics│                 │  🗄️ Business    │
    └───────────┘         └───────────┘                 └─────────────────┘
```

### 🎯 Fine-grained Routing Distribution Strategy

#### 1. UI Route Distribution (`/ui/*`) - Complex Aggregation Strategy
**Design Philosophy**: UI interfaces typically need to display comprehensive data from multiple backend services, thus adopting the middleware aggregation pattern.

```
UI Request Flow:
Browser → Kong Gateway → Middleware Service → Parallel Backend Calls → Data Aggregation → UI Response

Specific Route Mapping:
┌─────────────────────────┬──────────────────────────────────────────────┐
│ UI Route                │ Processing Flow                               │
├─────────────────────────┼──────────────────────────────────────────────┤
│ /ui/business/summary    │ Kong → Middleware → Business(gRPC) + Analytics(HTTP)│
│ /ui/analytics/summary   │ Kong → Middleware → Analytics(HTTP) + Business(gRPC)│
│ /ui/campus-auth/*       │ Kong → Middleware → MongoDB (User Auth)      │
│ /ui/user                │ Kong → Middleware → User Management Logic    │
│ /ui/business            │ Kong → Middleware → Business Data Display    │
│ /ui/analytics           │ Kong → Middleware → Data Analytics Display   │
└─────────────────────────┴──────────────────────────────────────────────┘

Authentication: Cookie/Session
Advantages:
• Centralized complex business logic processing
• Intelligent multi-service data aggregation
• Unified error handling and retry mechanisms
• Data format standardization
```

#### 2. API Route Distribution (`/api/*`) - High-Performance Direct Strategy
**Design Philosophy**: API calls typically require low latency and high throughput, thus adopting direct access or Kong Lua processing patterns.

```
API Request Flow:
Client → Kong Gateway → Routing Decision → Direct Processing/Backend Service

Fine-grained Distribution Rules:
┌─────────────────────────┬──────────────────────────────────────────────┐
│ API Route               │ Processing Strategy                           │
├─────────────────────────┼──────────────────────────────────────────────┤
│ /api/business/summary   │ Kong Lua Script → Business Service (gRPC)   │
│ /api/analytics/summary  │ Kong → Middleware → Analytics + Business     │
│ /api/campus-auth/*      │ Kong → Middleware → MongoDB (User Auth)      │
│ /api/business/data      │ Kong → Middleware → Business Service (gRPC)  │
│ /api/analytics/dashboard│ Kong → Analytics Service (HTTP) Direct       │
│ /api/analytics/query    │ Kong → Analytics Service (HTTP) Direct       │
│ /api/analytics/export   │ Kong → Analytics Service (HTTP) Direct       │
└─────────────────────────┴──────────────────────────────────────────────┘

Authentication: JWT Token
Advantages:
• Ultra-low latency response
• High concurrency processing capability
• Reduced middleware overhead
• Direct service access
```

### 🔄 Traffic Distribution Decision Algorithm

#### Kong Gateway Intelligent Routing Decision Flow:

```lua
-- Kong Lua Routing Decision Pseudocode
function route_decision(request_path, request_method, auth_type)
    -- 1. Path Matching Phase
    if string.match(request_path, "^/ui/") then
        -- UI Routes: Complex Aggregation Strategy
        return {
            strategy = "middleware_aggregation",
            service = "middleware-service",
            auth = "cookie_session",
            processing = "complex_aggregation"
        }
    elseif string.match(request_path, "^/api/business/summary") then
        -- Special API: Kong Direct Processing
        return {
            strategy = "kong_lua_direct",
            service = "business-service-grpc",
            auth = "jwt_token",
            processing = "lua_script_execution"
        }
    elseif string.match(request_path, "^/api/analytics/dashboard") then
        -- Analytics API: Direct Access
        return {
            strategy = "direct_service_access",
            service = "analytics-service",
            auth = "jwt_token", 
            processing = "passthrough"
        }
    elseif string.match(request_path, "^/api/") then
        -- Other APIs: Middleware Processing
        return {
            strategy = "middleware_processing",
            service = "middleware-service",
            auth = "jwt_token",
            processing = "business_logic"
        }
    end
end
```

### 🏢 Detailed Service Architecture

#### 1. Frontend Service (React)
```yaml
Port: 3000
Tech Stack: React 18 + TypeScript + Axios
Main Functions:
  - User interface rendering and interaction
  - Frontend state management (Redux/Context)
  - API call encapsulation and error handling
  - Route management and page navigation
Deployment Features:
  - Docker containerized deployment
  - Nginx static file serving
  - Hot reload development mode support
```

#### 2. Kong API Gateway
```yaml
Ports: 8000 (Gateway), 8002 (Admin)
Tech Stack: Kong Gateway 3.4 + Lua Scripts + PostgreSQL
Core Functions:
  - Intelligent routing distribution
  - Authentication and authorization management
  - Rate limiting and circuit breaking
  - Monitoring and logging
  - CORS and security policies
Plugin Configuration:
  - JWT Authentication
  - Rate Limiting (200/min, 2000/hour, 10000/day)
  - CORS handling
  - Prometheus monitoring
  - Request ID tracking
```

#### 3. Middleware Service (Platform Aggregation Service)
```yaml
Port: 3001
Tech Stack: Node.js + Express + gRPC Client + Axios
Core Functions:
  - Multi-service data aggregation
  - Complex business logic processing
  - User authentication and permission management
  - Data format standardization
  - Error handling and retry mechanisms
Aggregation Pattern:
  - Parallel backend service calls
  - Promise.allSettled() fault tolerance
  - Data merging and formatting
  - Unified response structure
Service Dependencies:
  - Business Service (gRPC)
  - Analytics Service (HTTP)
  - MongoDB (User Authentication)
```

#### 4. Business Service
```yaml
Port: 9090 (gRPC)
Tech Stack: Go + gRPC + MySQL + GORM
Business Domains:
  - Course Management
  - Enrollment Management
  - Grade Management
  - Business Records
  - Library Management
Data Models:
  - User Information
  - Course Information
  - Enrollment Records
  - Grade Records
  - Business Operation Logs
Performance Features:
  - High-performance gRPC communication
  - Connection pool management
  - Database transaction processing
  - Cache strategy optimization
```

#### 5. Analytics Service
```yaml
Port: 8001
Tech Stack: Python + FastAPI + MongoDB + Redis
Analytics Functions:
  - User behavior analysis
  - Business data statistics
  - Report generation and export
  - Real-time data monitoring
  - Event tracking and analysis
Data Processing:
  - ETL data processing pipeline
  - Real-time stream data analysis
  - Historical data mining
  - Predictive analysis algorithms
Storage Strategy:
  - MongoDB: Event data, analysis results
  - Redis: Real-time computation cache
  - Data partitioning and index optimization
```

### 🗄️ Data Storage Architecture

#### Database Separation Strategy
```yaml
MySQL (Business Database):
  Port: 3306
  Purpose: Relational business data storage
  Data Types:
    - User information and permissions
    - Course and class information
    - Enrollment and grade records
    - Business operation logs
  Features:
    - ACID transaction support
    - Complex relational queries
    - Data consistency guarantee

MongoDB (Analytics Database):
  Port: 27017
  Purpose: Document-based and analytics data
  Data Types:
    - User behavior events
    - Analysis statistical results
    - Logs and monitoring data
    - Unstructured data
  Features:
    - Flexible document structure
    - High-performance read/write
    - Horizontal scaling capability

Redis (Cache Database):
  Port: 6379
  Purpose: High-speed cache and session storage
  Data Types:
    - User session information
    - Hot data cache
    - Real-time computation results
    - Distributed locks
  Features:
    - Memory-level performance
    - Multiple data structures
    - Persistence strategies
```

### 🔐 Authentication and Authorization System

#### Dual Authentication Strategy
```yaml
UI Route Authentication (Cookie/Session):
  Authentication Flow:
    User Login → Generate Session → Write Cookie → Subsequent Requests Auto-carry
  Advantages:
    - User-friendly experience
    - Automatic renewal management
    - CSRF protection
    - Browser environment friendly
  
API Route Authentication (JWT Token):
  Authentication Flow:
    Client Authentication → Get JWT Token → Request Header with Bearer Token
  Advantages:
    - Stateless design
    - Cross-domain friendly
    - Mobile-friendly
    - Microservices architecture friendly
    
Permission Control:
  User Roles:
    - student: Student permissions
    - teacher: Teacher permissions
    - admin: Administrator permissions
  Permission Levels:
    - read: Read permissions
    - write: Write permissions
    - manage: Management permissions
```

### 📊 Monitoring and Observability

#### Multi-level Monitoring System
```yaml
Gateway Level Monitoring:
  - Kong Prometheus plugin
  - Request QPS, latency, error rate
  - Route performance analysis
  - Rate limiting and circuit breaker statistics

Application Level Monitoring:
  - Service health check endpoints
  - Business metrics monitoring
  - Error log aggregation
  - Performance trace analysis

Infrastructure Monitoring:
  - Docker container monitoring
  - Database performance monitoring
  - Network connection status
  - Resource usage statistics

Log Management:
  - Unified log format
  - Request ID tracking
  - Correlated log queries
  - Error alerting mechanisms
```

### 🚀 Deployment and Operations

#### Docker Containerized Deployment
```yaml
Deployment Architecture:
  - Docker Compose unified orchestration
  - Multi-environment configuration management
  - Container health checks
  - Automatic restart strategies

Service Discovery:
  - Docker network interconnection
  - Service name resolution
  - Load balancing configuration
  - Automatic failover

Data Persistence:
  - Docker Volume management
  - Data backup strategies
  - Disaster recovery plans
  - Data migration tools
```

### 🔄 Development and Testing

#### Development Environment
```bash
# Start complete development environment
./docker-compose.sh up -d

# Individual frontend development
cd frontend && npm run dev

# Individual middleware development
cd middle-platform && npm run dev

# Individual backend service development
cd backend/business-service && go run main.go
cd backend/analytics-service && python main.py
```

#### Testing Strategy
```bash
# API Testing
./api-gateway/test-api-business-summary.sh

# Health Checks
curl http://localhost:8000/health/middleware
curl http://localhost:8000/health/analytics

# Performance Testing
ab -n 1000 -c 10 http://localhost:8000/api/business/summary
```

### 📚 Additional Documentation

- [API Gateway Configuration](api-gateway/README.md) - Detailed Kong setup
- [Docker Setup](docker/README.md) - Container orchestration guide
- [API Routes Documentation](api-gateway/API_ROUTES.md) - Complete routing guide

### 🛠️ Technology Stack Summary

```yaml
Frontend: React 18, TypeScript, Axios
API Gateway: Kong 3.4, Lua Scripting
Middleware: Node.js, Express, gRPC
Backend Services: Go (gRPC), Python (FastAPI)
Databases: MySQL, MongoDB, Redis
Infrastructure: Docker, Docker Compose
Monitoring: Prometheus, Kong Analytics
Authentication: JWT, Cookie/Session
```

This architecture provides a robust, scalable, and high-performance solution for modern campus management systems with intelligent traffic distribution and fine-grained service orchestration.