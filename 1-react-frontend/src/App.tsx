import React, { useState, useEffect } from 'react';
import CampusLogin from './components/CampusLogin';
import CampusDashboard from './components/CampusDashboard';
import './App.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  profile?: any;
}

interface LoginFormData {
  userId: string;
  password: string;
  captcha: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');

  // 检查用户认证状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/ui/campus-auth/check', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (credentials: LoginFormData) => {
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/ui/campus-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setLoginError('');
      } else {
        setLoginError(data.message || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('网络错误，请稍后重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/ui/campus-auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setUser(null);
        setLoginError('');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // 即使请求失败，也清除本地用户状态
      setUser(null);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className=\"app-loading\">
        <div className=\"loading-container\">
          <div className=\"loading-spinner\"></div>
          <p>正在加载校园管理系统...</p>
        </div>
      </div>
    );
  }

  // 已登录状态 - 显示仪表板
  if (user) {
    return (
      <div className=\"app\">
        <CampusDashboard user={user} onLogout={handleLogout} />
      </div>
    );
  }

  // 未登录状态 - 显示登录页面
  return (
    <div className=\"app\">
      <CampusLogin
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    </div>
  );
}

export default App;