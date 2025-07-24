import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserSession, LoginLog, OperationLog, Notification } from '../models/CampusUser';
import { User, Student, Teacher } from '../models/User';
import { trustKong } from '../middleware/trust-kong';

const router = express.Router();

// 应用Kong信任中间件到非认证路由
router.use('/notifications', trustKong);
router.use('/profile', trustKong);

// 校园用户登录
router.post('/login', async (req, res) => {
  const { userId, password, captcha } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent') || '';

  try {
    // 验证必填字段
    if (!userId || !password) {
      await logLoginAttempt(userId, ipAddress, userAgent, 'failed', 'Missing credentials');
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      });
    }

    // 从MongoDB查询用户信息
    const user = await User.findOne({ 
      id: userId, 
      status: 'active' 
    });

    if (!user) {
      await logLoginAttempt(userId, ipAddress, userAgent, 'failed', 'User not found');
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await logLoginAttempt(userId, ipAddress, userAgent, 'failed', 'Invalid password');
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成会话ID和JWT token
    const sessionId = crypto.randomUUID();
    const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时

    // 创建JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        name: user.name,
        email: user.email,
        sessionId 
      },
      process.env.JWT_SECRET || 'campus-jwt-secret',
      { expiresIn: '24h' }
    );

    // 保存会话到MongoDB
    const userSession = new UserSession({
      userId: user.id,
      sessionId,
      userAgent,
      ipAddress,
      expires: sessionExpires,
      isActive: true
    });

    await userSession.save();

    // 设置session cookie
    req.session.userId = user.id;
    req.session.userType = user.role;
    req.session.sessionId = sessionId;

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 记录成功登录日志
    await logLoginAttempt(userId, ipAddress, userAgent, 'success');

    // 记录操作日志
    await logOperation(user.id, 'authentication', 'login', '用户登录', ipAddress, userAgent);

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatarUrl
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    await logLoginAttempt(userId, ipAddress, userAgent, 'failed', 'System error');
    res.status(500).json({
      success: false,
      message: '系统错误，请稍后重试'
    });
  }
});

// 校园用户登出
router.post('/logout', async (req, res) => {
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent') || '';

  try {
    if (req.session.userId && req.session.sessionId) {
      // 查找并更新会话状态
      const session = await UserSession.findOne({
        sessionId: req.session.sessionId,
        userId: req.session.userId
      });

      if (session) {
        session.isActive = false;
        await session.save();

        // 记录登出日志
        await LoginLog.create({
          userId: req.session.userId,
          loginTime: session.loginTime,
          logoutTime: new Date(),
          ipAddress,
          userAgent,
          loginStatus: 'logout',
          sessionDuration: Math.floor((Date.now() - session.loginTime.getTime()) / 1000)
        });

        // 记录操作日志
        await logOperation(
          req.session.userId, 
          'authentication', 
          'logout', 
          '用户登出', 
          ipAddress, 
          userAgent
        );
      }
    }

    // 销毁session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({
          success: false,
          message: '登出失败'
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: '登出成功'
      });
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: '系统错误'
    });
  }
});

// 检查认证状态
router.get('/check', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.sessionId) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    // 验证会话是否有效
    const session = await UserSession.findOne({
      sessionId: req.session.sessionId,
      userId: req.session.userId,
      isActive: true,
      expires: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: '会话已过期'
      });
    }

    // 更新最后活动时间
    session.lastActivity = new Date();
    await session.save();

    // 从MongoDB获取用户信息
    const user = await User.findOne({ 
      id: req.session.userId, 
      status: 'active' 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatarUrl
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      success: false,
      message: '系统错误'
    });
  }
});

// 获取用户通知
router.get('/notifications', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId: user.id });
    const unreadCount = await Notification.countDocuments({ 
      userId: user.id, 
      isRead: false 
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: '获取通知失败'
    });
  }
});

// 标记通知为已读
router.put('/notifications/:id/read', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

// 辅助函数：记录登录日志
async function logLoginAttempt(
  userId: string, 
  ipAddress: string, 
  userAgent: string, 
  status: 'success' | 'failed', 
  failureReason?: string
) {
  try {
    await LoginLog.create({
      userId,
      ipAddress,
      userAgent,
      loginStatus: status,
      failureReason
    });
  } catch (error) {
    console.error('Log login attempt error:', error);
  }
}

// 辅助函数：记录操作日志
async function logOperation(
  userId: string,
  module: string,
  action: string,
  description: string,
  ipAddress: string,
  userAgent: string,
  requestData?: any,
  responseStatus?: number
) {
  try {
    await OperationLog.create({
      userId,
      module,
      action,
      description,
      ipAddress,
      userAgent,
      requestData,
      responseStatus
    });
  } catch (error) {
    console.error('Log operation error:', error);
  }
}

export default router;