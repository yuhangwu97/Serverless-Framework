import React, { useState, useEffect } from 'react';
import './CampusDashboard.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  profile?: any;
}

interface Notification {
  id: string;
  type: 'course' | 'grade' | 'library' | 'dormitory' | 'system' | 'announcement';
  title: string;
  content: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const CampusDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeModule, setActiveModule] = useState('home');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 获取通知数据
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/ui/campus-auth/notifications', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/ui/campus-auth/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getModules = () => {
    const baseModules = [
      { id: 'home', name: '首页', icon: '🏠' },
      { id: 'profile', name: '个人信息', icon: '👤' }
    ];

    if (user.role === 'student') {
      return [
        ...baseModules,
        { id: 'courses', name: '我的课程', icon: '📚' },
        { id: 'grades', name: '成绩查询', icon: '📊' },
        { id: 'library', name: '图书馆', icon: '📖' },
        { id: 'dormitory', name: '宿舍管理', icon: '🏠' },
        { id: 'campus-card', name: '校园卡', icon: '💳' }
      ];
    } else if (user.role === 'teacher') {
      return [
        ...baseModules,
        { id: 'my-courses', name: '我的课程', icon: '🎓' },
        { id: 'grade-input', name: '成绩录入', icon: '✍️' },
        { id: 'students', name: '学生管理', icon: '👥' },
        { id: 'research', name: '科研管理', icon: '🔬' }
      ];
    } else {
      return [
        ...baseModules,
        { id: 'user-management', name: '用户管理', icon: '👥' },
        { id: 'course-management', name: '课程管理', icon: '📚' },
        { id: 'system-settings', name: '系统设置', icon: '⚙️' },
        { id: 'reports', name: '统计报告', icon: '📊' }
      ];
    }
  };

  const renderContent = () => {
    switch (activeModule) {
      case 'home':
        return <HomeContent user={user} />;
      case 'profile':
        return <ProfileContent user={user} />;
      case 'courses':
      case 'my-courses':
        return <CoursesContent user={user} />;
      case 'grades':
        return <GradesContent user={user} />;
      default:
        return (
          <div className=\"module-placeholder\">
            <div className=\"placeholder-content\">
              <h3>功能开发中</h3>
              <p>该功能正在开发中，敬请期待！</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className=\"campus-dashboard\">
      {/* 顶部导航栏 */}
      <header className=\"dashboard-header\">
        <div className=\"header-left\">
          <div className=\"logo\">
            <img src=\"/logo-university.png\" alt=\"University\" />
            <span>清华大学校园管理系统</span>
          </div>
        </div>
        
        <div className=\"header-right\">
          {/* 通知中心 */}
          <div className=\"notifications-wrapper\">
            <button 
              className=\"notification-btn\"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {unreadCount > 0 && (
                <span className=\"notification-badge\">{unreadCount}</span>
              )}
            </button>
            
            {showNotifications && (
              <div className=\"notifications-panel\">
                <div className=\"notifications-header\">
                  <h4>通知消息</h4>
                  <button onClick={() => setShowNotifications(false)}>×</button>
                </div>
                <div className=\"notifications-list\">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className=\"notification-content\">
                          <h5>{notification.title}</h5>
                          <p>{notification.content}</p>
                          <span className=\"notification-time\">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className={`priority-indicator ${notification.priority}`}></div>
                      </div>
                    ))
                  ) : (
                    <div className=\"no-notifications\">暂无通知消息</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 用户菜单 */}
          <div className=\"user-menu\">
            <div className=\"user-info\">
              <img 
                src={user.avatar || '/default-avatar.png'} 
                alt={user.name}
                className=\"user-avatar\"
              />
              <span className=\"user-name\">{user.name}</span>
              <span className=\"user-role\">
                {user.role === 'student' ? '学生' : 
                 user.role === 'teacher' ? '教师' : '管理员'}
              </span>
            </div>
            <button className=\"logout-btn\" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className=\"dashboard-body\">
        {/* 左侧导航菜单 */}
        <nav className=\"dashboard-sidebar\">
          <div className=\"sidebar-menu\">
            {getModules().map(module => (
              <button
                key={module.id}
                className={`menu-item ${activeModule === module.id ? 'active' : ''}`}
                onClick={() => setActiveModule(module.id)}
              >
                <span className=\"menu-icon\">{module.icon}</span>
                <span className=\"menu-text\">{module.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* 主内容区域 */}
        <main className=\"dashboard-content\">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// 首页内容组件
const HomeContent: React.FC<{ user: User }> = ({ user }) => {
  const currentTime = new Date().toLocaleString('zh-CN');
  
  return (
    <div className=\"home-content\">
      <div className=\"welcome-section\">
        <h2>欢迎回来，{user.name}！</h2>
        <p>当前时间：{currentTime}</p>
      </div>

      <div className=\"quick-stats\">
        <div className=\"stat-card\">
          <div className=\"stat-icon\">📚</div>
          <div className=\"stat-info\">
            <h3>本学期课程</h3>
            <span className=\"stat-number\">6</span>
          </div>
        </div>
        
        <div className=\"stat-card\">
          <div className=\"stat-icon\">📊</div>
          <div className=\"stat-info\">
            <h3>平均成绩</h3>
            <span className=\"stat-number\">88.5</span>
          </div>
        </div>
        
        <div className=\"stat-card\">
          <div className=\"stat-icon\">📖</div>
          <div className=\"stat-info\">
            <h3>借阅图书</h3>
            <span className=\"stat-number\">3</span>
          </div>
        </div>
        
        <div className=\"stat-card\">
          <div className=\"stat-icon\">🏠</div>
          <div className=\"stat-info\">
            <h3>宿舍</h3>
            <span className=\"stat-number\">紫荆1号楼</span>
          </div>
        </div>
      </div>

      <div className=\"recent-activities\">
        <h3>最近活动</h3>
        <div className=\"activity-list\">
          <div className=\"activity-item\">
            <span className=\"activity-time\">今天 14:30</span>
            <span className=\"activity-desc\">查看了《数据结构》课程资料</span>
          </div>
          <div className=\"activity-item\">
            <span className=\"activity-time\">今天 10:15</span>
            <span className=\"activity-desc\">提交了《算法分析》作业</span>
          </div>
          <div className=\"activity-item\">
            <span className=\"activity-time\">昨天 16:45</span>
            <span className=\"activity-desc\">借阅了《计算机网络》教材</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 个人信息组件
const ProfileContent: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className=\"profile-content\">
      <h2>个人信息</h2>
      <div className=\"profile-form\">
        <div className=\"form-section\">
          <h3>基本信息</h3>
          <div className=\"form-grid\">
            <div className=\"form-field\">
              <label>用户ID</label>
              <input type=\"text\" value={user.id} disabled />
            </div>
            <div className=\"form-field\">
              <label>姓名</label>
              <input type=\"text\" value={user.name} />
            </div>
            <div className=\"form-field\">
              <label>邮箱</label>
              <input type=\"email\" value={user.email} />
            </div>
            <div className=\"form-field\">
              <label>角色</label>
              <input type=\"text\" value={
                user.role === 'student' ? '学生' : 
                user.role === 'teacher' ? '教师' : '管理员'
              } disabled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 课程内容组件
const CoursesContent: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className=\"courses-content\">
      <h2>{user.role === 'student' ? '我的课程' : '教授课程'}</h2>
      <div className=\"courses-grid\">
        <div className=\"course-card\">
          <h4>数据结构与算法</h4>
          <p>CS102 - 计算机科学与技术</p>
          <div className=\"course-info\">
            <span>学分：4.0</span>
            <span>时间：周二、周四 10:00-11:40</span>
          </div>
        </div>
        
        <div className=\"course-card\">
          <h4>计算机网络</h4>
          <p>CS201 - 计算机科学与技术</p>
          <div className=\"course-info\">
            <span>学分：3.0</span>
            <span>时间：周一、周三 14:00-15:40</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 成绩内容组件
const GradesContent: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className=\"grades-content\">
      <h2>成绩查询</h2>
      <div className=\"grades-table\">
        <table>
          <thead>
            <tr>
              <th>课程名称</th>
              <th>课程代码</th>
              <th>学分</th>
              <th>成绩</th>
              <th>绩点</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>数据结构与算法</td>
              <td>CS102</td>
              <td>4.0</td>
              <td>92</td>
              <td>4.0</td>
            </tr>
            <tr>
              <td>计算机网络</td>
              <td>CS201</td>
              <td>3.0</td>
              <td>88</td>
              <td>3.7</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CampusDashboard;