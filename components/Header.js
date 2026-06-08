import React, { useState } from 'react';

export default function Header({ 
  title, 
  subtitle, 
  email, 
  setEmail, 
  password,
  setPassword,
  emailStatus, 
  credits, 
  isCheckingEmail, 
  onVerifyEmail, 
  onLogout 
}) {
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <div className="logo-section">
            <img src="/timage.png" alt="天工创界 Logo" className="logo-img" />
            <div>
              <h1 className="logo-title">{title}</h1>
              {subtitle && <span className="logo-tagline">{subtitle}</span>}
            </div>
          </div>

          <div className="user-section">
            {emailStatus === 'verified' ? (
              <div className="user-badge">
                <span className="user-email">✉️ {email}</span>
                <span className="user-credits">💎 剩余额度: <strong>{credits}</strong></span>
                <button onClick={() => setShowRechargeModal(true)} className="btn-recharge">⚡ 充值请联系</button>
                <button onClick={onLogout} className="btn-logout">退出</button>
              </div>
            ) : (
              <div className="login-form">
                <input
                  type="email"
                  placeholder="账号 (邮箱)..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input email-input"
                />
                <input
                  type="password"
                  placeholder="密码..."
                  value={password || ''}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input password-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onVerifyEmail(email, password);
                  }}
                />
                <button
                  onClick={() => onVerifyEmail(email, password)}
                  disabled={isCheckingEmail || !email || !password}
                  className="btn-login"
                >
                  {isCheckingEmail ? '登录中...' : '登录 / 注册'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(11, 17, 32, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease-out'
        }} onClick={() => setShowRechargeModal(false)}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 55, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            borderRadius: '24px',
            padding: '36px 32px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 50px rgba(45, 212, 191, 0.15)',
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowRechargeModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.8)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'var(--color-text-muted)';
              }}
            >✕</button>
            
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '1px solid rgba(45, 212, 191, 0.4)'
            }}>
              <span style={{ fontSize: '2rem' }}>💎</span>
            </div>

            <h3 style={{ 
              fontFamily: 'var(--font-title)', 
              fontSize: '1.4rem', 
              color: '#fff',
              margin: '0 0 12px 0',
              fontWeight: '700',
              letterSpacing: '0.02em'
            }}>充值积分 / API接入</h3>
            
            <p style={{ 
              color: 'var(--color-text-muted)', 
              fontSize: '0.9rem', 
              lineHeight: '1.6',
              margin: '0 0 24px 0' 
            }}>请扫码添加客服微信进行专属充值，享受定制化生图服务与API接入支持。</p>

            <div style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '16px',
              display: 'inline-block',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              <img src="/contact.png" alt="客服微信二维码" style={{
                width: '180px',
                height: '180px',
                display: 'block',
                borderRadius: '8px'
              }} />
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              fontSize: '0.8rem', 
              color: 'rgba(148, 163, 184, 0.6)',
              fontWeight: '500'
            }}>微信号: UA5201314fyh</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root {
          --color-bg-main: #0b1120;
          --color-bg-card: rgba(30, 41, 59, 0.7);
          --color-bg-card-hover: rgba(30, 41, 59, 0.95);
          --color-primary: #0d9488;
          --color-primary-hover: #0f766e;
          --color-accent: #f59e0b;
          --color-accent-hover: #d97706;
          --color-text-main: #f8fafc;
          --color-text-muted: #94a3b8;
          --color-border: rgba(255, 255, 255, 0.08);
          --font-title: 'Outfit', 'Inter', -apple-system, sans-serif;
          --font-body: 'Inter', -apple-system, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          background-color: var(--color-bg-main);
          color: var(--color-text-main);
          font-family: var(--font-body);
          -webkit-font-smoothing: antialiased;
          background-image: 
            radial-gradient(at 0% 0%, rgba(13, 148, 136, 0.1) 0, transparent 50%),
            radial-gradient(at 50% 0%, rgba(245, 158, 11, 0.05) 0, transparent 50%),
            radial-gradient(at 100% 100%, rgba(13, 148, 136, 0.08) 0, transparent 50%);
          background-attachment: fixed;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      <style jsx>{`
        /* Header Styling */
        .site-header {
          background-color: var(--color-bg-card);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .header-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-img {
          width: 36px;
          height: 36px;
          border-radius: 8px;
        }

        .logo-title {
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .logo-tagline {
          font-size: 0.75rem;
          color: var(--color-accent);
          font-weight: 500;
          display: block;
        }

        /* User Authentication Styling */
        .login-form {
          display: flex;
          gap: 0.75rem;
        }

        .login-input {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.5rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
          width: 220px;
          transition: all 0.3s ease;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .btn-login {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-login:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .user-badge {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background-color: rgba(15, 23, 42, 0.4);
          padding: 0.4rem 1.25rem;
          border-radius: 50px;
          border: 1px solid var(--color-border);
        }

        .user-email {
          font-size: 0.85rem;
          color: var(--color-text-main);
        }

        .user-credits {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .user-credits strong {
          color: var(--color-accent);
          font-weight: 700;
        }

        .btn-recharge {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: var(--color-accent);
          border-radius: 6px;
          padding: 0.25rem 0.65rem;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-recharge:hover {
          background-color: rgba(245, 158, 11, 0.15);
          transform: translateY(-1px);
        }

        .btn-logout {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 0.25rem 0.5rem;
          transition: color 0.2s ease;
        }

        .btn-logout:hover {
          color: #f1f5f9;
        }
      `}</style>
    </>
  );
}
