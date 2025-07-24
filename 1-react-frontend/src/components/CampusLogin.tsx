import React, { useState } from 'react';
import './CampusLogin.css';

interface LoginFormData {
  userId: string;
  password: string;
  captcha: string;
}

interface CampusLoginProps {
  onLogin: (credentials: LoginFormData) => void;
  loading?: boolean;
  error?: string;
}

const CampusLogin: React.FC<CampusLoginProps> = ({ onLogin, loading = false, error }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    userId: '',
    password: '',
    captcha: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(formData);
  };

  const refreshCaptcha = () => {
    // 刷新验证码逻辑
    console.log('Refresh captcha');
  };

  return (
    <div className=\"campus-login-container\">
      <div className=\"login-background\">
        <div className=\"background-overlay\"></div>
      </div>
      
      <div className=\"login-content\">
        {/* 左侧信息 */}
        <div className=\"login-info\">
          <div className=\"university-logo\">
            <img src=\"/logo-university.png\" alt=\"University Logo\" />
          </div>
          <h1 className=\"university-title\">
            清华大学校园管理系统
          </h1>
          <p className=\"university-subtitle\">
            Tsinghua University Campus Management System
          </p>
          <div className=\"info-features\">
            <div className=\"feature-item\">
              <span className=\"feature-icon\">🎓</span>
              <span>学术管理</span>
            </div>
            <div className=\"feature-item\">
              <span className=\"feature-icon\">📚</span>
              <span>课程选择</span>
            </div>
            <div className=\"feature-item\">
              <span className=\"feature-icon\">🏠</span>
              <span>校园服务</span>
            </div>
            <div className=\"feature-item\">
              <span className=\"feature-icon\">📊</span>
              <span>成绩查询</span>
            </div>
          </div>
        </div>

        {/* 右侧登录表单 */}
        <div className=\"login-form-container\">
          <div className=\"login-form-card\">
            <div className=\"login-header\">
              <h2>校园统一身份认证</h2>
              <p>请使用您的学号/工号登录</p>
            </div>

            {error && (
              <div className=\"error-message\">
                <span className=\"error-icon\">⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className=\"login-form\">
              <div className=\"form-group\">
                <label htmlFor=\"userId\">用户名</label>
                <div className=\"input-wrapper\">
                  <input
                    type=\"text\"
                    id=\"userId\"
                    name=\"userId\"
                    value={formData.userId}
                    onChange={handleInputChange}
                    placeholder=\"请输入学号或工号\"
                    required
                    autoComplete=\"username\"
                  />
                  <span className=\"input-icon\">👤</span>
                </div>
              </div>

              <div className=\"form-group\">
                <label htmlFor=\"password\">密码</label>
                <div className=\"input-wrapper\">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id=\"password\"
                    name=\"password\"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder=\"请输入密码\"
                    required
                    autoComplete=\"current-password\"
                  />
                  <button
                    type=\"button\"
                    className=\"password-toggle\"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className=\"form-group captcha-group\">
                <label htmlFor=\"captcha\">验证码</label>
                <div className=\"captcha-wrapper\">
                  <input
                    type=\"text\"
                    id=\"captcha\"
                    name=\"captcha\"
                    value={formData.captcha}
                    onChange={handleInputChange}
                    placeholder=\"验证码\"
                    required
                    maxLength={4}
                  />
                  <div className=\"captcha-display\" onClick={refreshCaptcha}>
                    <img 
                      src=\"/api/captcha\" 
                      alt=\"验证码\" 
                      title=\"点击刷新验证码\"
                    />
                  </div>
                </div>
              </div>

              <div className=\"form-options\">
                <label className=\"remember-checkbox\">
                  <input type=\"checkbox\" />
                  <span className=\"checkmark\"></span>
                  记住登录状态
                </label>
                <a href=\"#forgot\" className=\"forgot-link\">忘记密码？</a>
              </div>

              <button
                type=\"submit\"
                className={`login-button ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className=\"loading-spinner\"></span>
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </form>

            <div className=\"login-footer\">
              <div className=\"help-links\">
                <a href=\"#help\">登录帮助</a>
                <span className=\"divider\">|</span>
                <a href=\"#register\">新用户注册</a>
                <span className=\"divider\">|</span>
                <a href=\"#contact\">联系我们</a>
              </div>
              <div className=\"system-info\">
                <p>推荐使用Chrome、Firefox、Safari浏览器</p>
                <p>© 2024 清华大学 信息化技术中心</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusLogin;