from fastapi import Request
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class UserContext:
    """用户上下文，从Kong传递的headers中提取"""
    def __init__(self, request: Request):
        self.id = request.headers.get("x-user-id")
        self.role = request.headers.get("x-user-role")
        self.name = request.headers.get("x-user-name")
        self.email = request.headers.get("x-user-email")
    
    @property
    def is_authenticated(self) -> bool:
        return self.id is not None
    
    def __str__(self):
        return f"User(id={self.id}, role={self.role}, name={self.name})"

async def trust_kong_middleware(request: Request, call_next):
    """
    Kong信任中间件
    从Kong传递的headers中提取用户信息，无条件信任
    """
    # 提取用户信息
    user_context = UserContext(request)
    
    # 将用户信息添加到request state
    request.state.user = user_context
    
    # 记录请求日志
    if user_context.is_authenticated:
        logger.info(f"Request from {user_context} to {request.url.path}")
    else:
        logger.info(f"Anonymous request to {request.url.path}")
    
    # 继续处理请求
    response = await call_next(request)
    
    return response

def get_current_user(request: Request) -> Optional[UserContext]:
    """
    获取当前用户信息
    """
    return getattr(request.state, 'user', None)

def require_user(request: Request) -> UserContext:
    """
    要求用户认证（通过Kong）
    """
    user = get_current_user(request)
    if not user or not user.is_authenticated:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=401,
            detail="Authentication required - No user info from Kong"
        )
    return user

def require_role(request: Request, required_roles: list) -> UserContext:
    """
    要求特定角色权限
    """
    user = require_user(request)
    if user.role not in required_roles:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required roles: {required_roles}"
        )
    return user