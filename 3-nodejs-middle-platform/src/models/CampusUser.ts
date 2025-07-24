import mongoose, { Document, Schema } from 'mongoose';

// 用户会话接口
export interface IUserSession extends Document {
  userId: string;
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  loginTime: Date;
  lastActivity: Date;
  expires: Date;
  isActive: boolean;
}

// 登录日志接口
export interface ILoginLog extends Document {
  userId: string;
  loginTime: Date;
  logoutTime?: Date;
  ipAddress: string;
  userAgent: string;
  loginStatus: 'success' | 'failed' | 'logout';
  failureReason?: string;
  sessionDuration?: number;
}

// 操作日志接口
export interface IOperationLog extends Document {
  userId: string;
  module: string;
  action: string;
  description: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  requestData?: any;
  responseStatus?: number;
}

// 通知消息接口
export interface INotification extends Document {
  userId: string;
  type: 'course' | 'grade' | 'library' | 'dormitory' | 'system' | 'announcement';
  title: string;
  content: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata?: any;
}

// 用户会话模式
const UserSessionSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  loginTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expires: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'user_sessions'
});

// 设置TTL索引，自动删除过期会话
UserSessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

// 登录日志模式
const LoginLogSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  loginTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  logoutTime: {
    type: Date
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true,
    index: true
  },
  loginStatus: {
    type: String,
    enum: ['success', 'failed', 'logout'],
    required: true
  },
  failureReason: {
    type: String
  },
  sessionDuration: {
    type: Number // 会话持续时间（秒）
  }
}, {
  collection: 'login_logs'
});

// 操作日志模式
const OperationLogSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  requestData: {
    type: Schema.Types.Mixed
  },
  responseStatus: {
    type: Number
  }
}, {
  collection: 'operation_logs'
});

// 通知消息模式
const NotificationSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['course', 'grade', 'library', 'dormitory', 'system', 'announcement'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  collection: 'notifications'
});

// 导出模型
export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);
export const LoginLog = mongoose.model<ILoginLog>('LoginLog', LoginLogSchema);
export const OperationLog = mongoose.model<IOperationLog>('OperationLog', OperationLogSchema);
export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);