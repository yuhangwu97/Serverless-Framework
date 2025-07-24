import { Request, Response, NextFunction } from 'express';

// Kong传递的用户信息头部
interface KongUserHeaders {
  'x-user-id': string;
  'x-user-role': string;
  'x-user-name': string;
  'x-user-email': string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
        email: string;
      };
    }
  }
}

/**
 * Kong信任中间件
 * 从Kong传递的Headers中提取用户信息，无条件信任
 */
export const trustKong = (req: Request, res: Response, next: NextFunction) => {
  // 从Kong传递的headers中提取用户信息
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  // 如果有用户信息，设置到request对象
  if (userId) {
    req.user = {
      id: userId,
      role: userRole,
      name: userName,
      email: userEmail
    };
  }

  next();
};

/**
 * 检查用户是否已认证（通过Kong传递的headers）
 */
export const requireKongAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required - No user info from Kong'
    });
  }
  next();
};

/**
 * 检查用户角色权限
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * 日志记录中间件 - 记录用户操作
 */
export const logUserAction = (action: string, module: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      // 这里可以记录用户操作日志
      console.log(`User ${req.user.id} performed ${action} in ${module} module`);
    }
    next();
  };
};