import Head from 'next/head';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SurveyPage() {
  const [formData, setFormData] = useState({
    industry: '',
    industryOther: '',
    functions: [],
    functionOther: '',
    workflow: '',
    contactName: '',
    contactMethod: '',
    company: '',
  });

  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Header states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    // 自动重定向到升级版的 AI 转型诊断 Agent 页面
    window.location.replace('/diagnosis');
    
    const storedEmail = localStorage.getItem('timage_email');
    const storedPassword = localStorage.getItem('timage_password');
    const storedVerified = localStorage.getItem('timage_verified') === 'true';

    if (storedEmail && storedPassword && storedVerified) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      handleVerifyEmail(storedEmail, storedPassword);
    }
  }, []);

  const handleVerifyEmail = async (emailToVerify, passwordToVerify) => {
    if (!emailToVerify || !EMAIL_REGEX.test(emailToVerify)) {
      setErrorMessage('请输入有效的电子邮箱！');
      return;
    }
    if (!passwordToVerify) {
      setErrorMessage('请输入密码！');
      return;
    }
    setIsCheckingEmail(true);
    setErrorMessage('');
    try {
      const response = await axios.post('/api/timage/pre-check', { email: emailToVerify, password: passwordToVerify });
      if (response.data?.success) {
        setEmailStatus('verified');
        setCredits(response.data.credits);
        localStorage.setItem('timage_email', emailToVerify);
        localStorage.setItem('timage_password', passwordToVerify);
        localStorage.setItem('timage_verified', 'true');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || '登录失败，请检查配置或网络');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('timage_email');
    localStorage.removeItem('timage_password');
    localStorage.removeItem('timage_verified');
    setEmail('');
    setPassword('');
    setEmailStatus('none');
    setCredits(0);
  };

  const industries = [
    '电商零售', '金融保险', '医疗健康', '教育培训', 
    '制造与工业', 'IT与软件', '客服与售后', '其他'
  ];

  const agentFunctions = [
    '智能客服/问答', '数据分析与报表', '文档自动生成', 
    '代码/研发辅助', '营销文案生成', '工作流自动化', '其他'
  ];

  const handleFunctionChange = (func) => {
    setFormData(prev => {
      const isSelected = prev.functions.includes(func);
      if (isSelected) {
        return { ...prev, functions: prev.functions.filter(f => f !== func) };
      } else {
        return { ...prev, functions: [...prev.functions, func] };
      }
    });
  };

  const handleOptimize = async () => {
    if (!formData.workflow && !formData.functions.length && !formData.functionOther) {
      setErrorMessage('请先填写一些初步的想法或工作流，AI才能帮助您完善需求。');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setAiSuggestion('');
    
    try {
      const response = await fetch('/api/survey/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('网络响应错误');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setAiSuggestion((prev) => prev + chunk);
        }
      }
    } catch (error) {
      console.error('优化失败:', error);
      setErrorMessage('请求失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.industry || formData.functions.length === 0 || !formData.workflow || !formData.contactName || !formData.contactMethod) {
      setErrorMessage('请填写所有必填字段（行业、至少一个功能、工作流、姓名、联系方式）');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await axios.post('/api/survey/submit', {
        ...formData,
        email,
        aiSuggestion
      });
      if (res.data?.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(res.data?.error || '提交失败');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="app-container">
        <Head>
          <title>天工创界 | 智能体定制需求调研</title>
        </Head>
        <Header
          title="天工创界"
          subtitle="智能体定制需求调研"
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          emailStatus={emailStatus}
          credits={credits}
          isCheckingEmail={isCheckingEmail}
          onVerifyEmail={handleVerifyEmail}
          onLogout={handleLogout}
        />
        <main className="main-workspace" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="workspace-card" style={{ textAlign: 'center', padding: '40px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '24px', color: '#10b981', marginBottom: '16px' }}>提交成功！</h2>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>感谢您参与调研，我们将仔细评估您的需求，并尽快与您联系。</p>
            <button 
              onClick={() => {
                setSubmitted(false); 
                setFormData({
                  industry: '',
                  industryOther: '',
                  functions: [],
                  functionOther: '',
                  workflow: '',
                  contactName: '',
                  contactMethod: '',
                  company: ''
                }); 
                setAiSuggestion('');
              }}
              className="generate-btn"
              style={{ padding: '12px 24px' }}
            >
              再填一份
            </button>
          </div>
        </main>
      <style jsx global>{`

        /* Hero Banner */
        .hero-banner {
          position: relative;
          background-image: url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center 30%;
          padding: 4.5rem 1.5rem;
          text-align: center;
          border-bottom: 1px solid var(--color-border);
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(11, 17, 32, 0.6) 0%, #0b1120 100%);
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-badge {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          border-radius: 50px;
          padding: 0.3rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .hero-title {
          font-family: var(--font-title);
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 1rem 0;
          line-height: 1.25;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .hero-desc {
          font-size: 1.05rem;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin: 0;
          text-shadow: 0 1px 5px rgba(0,0,0,0.5);
        }

        /* Workspace Layout */
        .main-workspace {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          width: 100%;
          box-sizing: border-box;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 2rem;
          align-items: start;
        }

        /* Sidebar Styling */
        .sidebar-section {
          background-color: var(--color-bg-card);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .section-header h3 {
          font-family: var(--font-title);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 0.4rem 0;
          color: #f1f5f9;
        }

        .section-header p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin: 0 0 1.5rem 0;
        }

        .category-group {
          margin-bottom: 1.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1.25rem;
        }

        .category-group:first-of-type {
          border-top: none;
          padding-top: 0;
        }

        .category-title {
          font-family: var(--font-title);
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 0.15rem 0;
          color: var(--color-accent);
        }

        .category-subtitle {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 0.85rem;
        }

        .types-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .type-item-btn {
          background-color: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 0.75rem 0.95rem;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--color-text-muted);
          width: 100%;
        }

        .type-item-btn:hover {
          background-color: rgba(15, 23, 42, 0.8);
          border-color: rgba(13, 148, 136, 0.4);
          color: #ffffff;
          transform: translateX(3px);
        }

        .type-item-btn.active {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(13, 148, 136, 0.05) 100%);
          border-color: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(13, 148, 136, 0.15);
        }

        .type-btn-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .type-btn-name {
          font-size: 0.85rem;
          font-weight: 600;
          line-height: 1.2;
        }

        .type-btn-ratio {
          font-size: 0.68rem;
          opacity: 0.8;
        }

        .type-btn-arrow {
          font-size: 1rem;
          opacity: 0.5;
          transition: transform 0.2s ease;
        }

        .type-item-btn:hover .type-btn-arrow {
          opacity: 1;
          transform: translateX(2px);
        }

        /* Generation Panel right side */
        .generation-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .config-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .config-header h3 {
          font-family: var(--font-title);
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: #f1f5f9;
        }

        .config-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 1.25rem;
        }

        .parameters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .param-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .param-item label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .param-input, .param-select {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.6rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .param-input:focus, .param-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .param-select option {
          background-color: #0b1120;
          color: white;
        }

        /* Workspace Main Options */
        .workspace-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .mode-tabs {
          display: flex;
          background-color: rgba(15, 23, 42, 0.6);
          padding: 0.3rem;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          margin-bottom: 1.5rem;
        }

        .mode-tab {
          flex: 1;
          background: transparent;
          border: none;
          border-radius: 8px;
          padding: 0.7rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--color-text-muted);
        }

        .mode-tab:hover {
          color: white;
        }

        .mode-tab.active {
          background-color: var(--color-primary);
          color: white;
          box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
        }

        /* Alerts */
        .alert {
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          margin-bottom: 1.25rem;
          font-weight: 500;
        }

        .alert-error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .alert-info {
          background-color: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.3);
          color: #38bdf8;
        }

        /* Upload Area */
        .upload-wrapper {
          margin-bottom: 1.5rem;
        }

        .upload-box-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .upload-dropzone {
          background-color: rgba(15, 23, 42, 0.4);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .upload-dropzone:hover {
          background-color: rgba(15, 23, 42, 0.8);
          border-color: var(--color-primary);
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1rem;
        }

        .upload-icon {
          font-size: 2.25rem;
          margin-bottom: 0.4rem;
        }

        .upload-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .upload-tip {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        .preview-holder {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .preview-holder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .btn-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .btn-remove:hover {
          background: rgba(239, 68, 68, 0.8);
        }

        /* Prompt Optimizer Card */
        .prompt-optimizer-card {
          background-color: rgba(13, 148, 136, 0.04);
          border: 1px dashed rgba(13, 148, 136, 0.3);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .prompt-optimizer-card:hover {
          border-color: rgba(13, 148, 136, 0.6);
          background-color: rgba(13, 148, 136, 0.06);
        }

        .optimizer-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .optimizer-input-group {
          display: flex;
          gap: 0.75rem;
        }

        .optimizer-input-field {
          flex: 1;
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .optimizer-input-field:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .btn-optimizer-action {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.65rem 1.25rem;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-optimizer-action:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .btn-optimizer-action:disabled {
          background-color: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.25);
          cursor: not-allowed;
        }

        .optimized-results-area {
          margin-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .results-tip {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .optimized-suggestions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
        }

        .optimized-suggestion-item {
          background-color: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .optimized-suggestion-item:hover {
          background-color: rgba(15, 23, 42, 0.8);
          border-color: var(--color-primary);
          transform: translateY(-2px);
        }

        .optimized-suggestion-item.active {
          border-color: var(--color-primary);
          background: rgba(13, 148, 136, 0.08);
          box-shadow: 0 0 10px rgba(13, 148, 136, 0.2);
        }

        .suggestion-badge {
          background: rgba(13, 148, 136, 0.15);
          color: #2dd4bf;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          align-self: flex-start;
        }

        .suggestion-text {
          font-size: 0.75rem;
          color: #e2e8f0;
          line-height: 1.4;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 4.2em;
        }

        .suggestion-action {
          font-size: 0.65rem;
          color: var(--color-primary);
          font-weight: 600;
          margin-top: auto;
          text-align: right;
        }

        /* Prompt Box Styling */
        .prompt-area {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .prompt-area label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .prompt-textarea {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1rem;
          color: var(--color-text-main);
          font-family: inherit;
          font-size: 0.9rem;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        /* Extra Settings controls */
        .extra-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.75rem;
        }

        .setting-control {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .setting-control label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .setting-select {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
        }

        /* Action Buttons */
        .btn-action-generate {
          background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1.1rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);
          letter-spacing: 0.02em;
        }

        .btn-action-generate:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.45);
        }

        .btn-action-generate:disabled {
          background: #334155;
          color: #64748b;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        /* Generation Results Card */
        .result-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(13, 148, 136, 0.4);
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 15px 35px rgba(13, 148, 136, 0.15);
        }

        .result-header h3 {
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 700;
          color: #2dd4bf;
          margin: 0 0 0.25rem 0;
        }

        .result-header p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0 0 1.5rem 0;
        }

        .result-body {
          display: grid;
          grid-template-columns: minmax(100px, 480px) 1fr;
          gap: 1.75rem;
          align-items: start;
        }

        .result-image-wrapper {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          background-color: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .result-img {
          width: 100%;
          height: auto;
          display: block;
          max-height: 520px;
          object-fit: contain;
        }

        .result-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .btn-result-action {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.85rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          text-decoration: none;
        }

        .btn-result-action:hover {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .btn-result-action.secondary {
          background-color: rgba(255,255,255,0.05);
          border: 1px solid var(--color-border);
          color: #cbd5e1;
        }

        .btn-result-action.secondary:hover {
          background-color: rgba(255,255,255,0.1);
          color: white;
        }

        /* Gallery Section */
        .gallery-section {
          margin-top: 4rem;
          border-top: 1px solid var(--color-border);
          padding-top: 3rem;
        }

        .gallery-header h3 {
          font-family: var(--font-title);
          font-size: 1.35rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 0.35rem 0;
        }

        .gallery-header p {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin: 0 0 2rem 0;
        }

        .gallery-loader, .gallery-empty {
          text-align: center;
          padding: 3rem;
          background-color: rgba(30, 41, 59, 0.2);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .gallery-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gallery-card:hover {
          background-color: var(--color-bg-card-hover);
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border-color: rgba(13, 148, 136, 0.3);
        }

        .gallery-img-container {
          height: 220px;
          overflow: hidden;
          background-color: rgba(0,0,0,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .gallery-card:hover .gallery-img {
          transform: scale(1.04);
        }

        .gallery-card-info {
          padding: 1rem;
        }

        .gallery-style-badge {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: var(--color-accent);
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 4px;
          padding: 0.15rem 0.4rem;
          display: inline-block;
          margin-bottom: 0.5rem;
        }

        .gallery-prompt-text {
          font-size: 0.8rem;
          color: #e2e8f0;
          line-height: 1.4;
          margin: 0 0 0.85rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 2.4em;
        }

        .gallery-card-actions {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.75rem;
          gap: 0.5rem;
        }

        .gallery-action-link, .gallery-action-btn {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .gallery-action-link:hover, .gallery-action-btn:hover {
          color: white;
          background-color: rgba(255,255,255,0.05);
        }

        /* Responsive breakpoints */
        @media (max-width: 1024px) {
          .workspace-grid {
            grid-template-columns: 1fr;
          }
          
          .hero-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 0.75rem 1rem;
          }

          .site-header {
            position: relative;
          }

          .login-form {
            width: 100%;
          }

          .login-input {
            width: 100%;
          }

          .main-workspace {
            padding: 1.5rem 1rem;
          }

          .result-body {
            grid-template-columns: 1fr;
          }

          .extra-settings, .upload-box-container {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>

      </div>
    );
  }

  return (
    <div className="app-container">
      <Head>
        <title>天工创界 | 智能体定制需求调研</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <Header
        title="天工创界"
        subtitle="智能体定制需求调研"
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        emailStatus={emailStatus}
        credits={credits}
        isCheckingEmail={isCheckingEmail}
        onVerifyEmail={handleVerifyEmail}
        onLogout={handleLogout}
      />

      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="hero-badge">ENTERPRISE AGENT SURVEY</span>
          <h2 className="hero-title">为您的业务量身定制 AI 智能体解决方案</h2>
          <p className="hero-desc">帮助我们更好地了解您的业务场景、行业痛点与工作流，由专业架构师及 AI 模型共同为您梳理最佳实践方案。</p>
        </div>
      </section>

      <main className="main-workspace">
        <div className="workspace-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '900px', margin: '0 auto' }}>
          
          <div className="workspace-card">
            {errorMessage && <div className="alert alert-error">⚠️ {errorMessage}</div>}
            
            <form onSubmit={handleSubmit} className="parameters-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 行业选择 */}
              <div className="param-item">
                <label>
                  1. 您的业务属于哪个行业？ <span style={{color: '#ef4444'}}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {industries.map(ind => (
                    <label key={ind} className="param-input" style={{ 
                      display: 'flex', alignItems: 'center', cursor: 'pointer',
                      border: formData.industry === ind ? '1px solid var(--color-primary)' : '', 
                      background: formData.industry === ind ? 'rgba(13, 148, 136, 0.15)' : ''
                    }}>
                      <input 
                        type="radio" 
                        name="industry" 
                        value={ind} 
                        checked={formData.industry === ind}
                        onChange={(e) => setFormData({...formData, industry: e.target.value})}
                        style={{ marginRight: '8px' }}
                      />
                      <span>{ind}</span>
                    </label>
                  ))}
                </div>
                {formData.industry === '其他' && (
                  <input 
                    type="text" 
                    placeholder="请填写您的行业" 
                    className="param-input"
                    style={{ marginTop: '12px' }}
                    value={formData.industryOther}
                    onChange={(e) => setFormData({...formData, industryOther: e.target.value})}
                  />
                )}
              </div>

              {/* 功能需求 */}
              <div className="param-item">
                <label>
                  2. 您希望智能体具备哪些核心功能？（可多选） <span style={{color: '#ef4444'}}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {agentFunctions.map(func => (
                    <label key={func} className="param-input" style={{ 
                      display: 'flex', alignItems: 'center', cursor: 'pointer',
                      border: formData.functions.includes(func) ? '1px solid var(--color-primary)' : '', 
                      background: formData.functions.includes(func) ? 'rgba(13, 148, 136, 0.15)' : ''
                    }}>
                      <input 
                        type="checkbox" 
                        checked={formData.functions.includes(func)}
                        onChange={() => handleFunctionChange(func)}
                        style={{ marginRight: '8px' }}
                      />
                      <span>{func}</span>
                    </label>
                  ))}
                </div>
                {formData.functions.includes('其他') && (
                  <input 
                    type="text" 
                    placeholder="请描述其他功能需求" 
                    className="param-input"
                    style={{ marginTop: '12px' }}
                    value={formData.functionOther}
                    onChange={(e) => setFormData({...formData, functionOther: e.target.value})}
                  />
                )}
              </div>

              {/* 工作流描述 */}
              <div className="param-item">
                <label>
                  3. 请简单描述您的业务工作流，或希望 AI 介入的环节 <span style={{color: '#ef4444'}}>*</span>
                </label>
                <textarea 
                  rows="5"
                  placeholder="例如：客户在系统提交工单后，我希望 AI 能自动提取关键问题，匹配知识库并生成初步回复方案，最后由人工确认发出..."
                  className="param-input"
                  style={{ height: 'auto', resize: 'vertical', marginTop: '8px' }}
                  value={formData.workflow}
                  onChange={(e) => setFormData({...formData, workflow: e.target.value})}
                ></textarea>
                
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={handleOptimize}
                    disabled={loading}
                    className="generate-btn"
                    style={{ width: 'auto', padding: '10px 24px', opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? 'AI 思考中...' : '🪄 让 AI 帮我梳理需求'}
                  </button>
                </div>
              </div>

              {/* AI 建议区域 */}
              {aiSuggestion && (
                <div className="prompt-optimizer-card" style={{ marginTop: '8px' }}>
                  <label className="optimizer-label">✨ AI 需求梳理建议</label>
                  <div style={{ 
                    color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6', 
                    whiteSpace: 'pre-wrap', background: 'rgba(15, 23, 42, 0.4)', 
                    padding: '16px', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.1)' 
                  }}>
                    {aiSuggestion}
                  </div>
                  <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, workflow: aiSuggestion})}
                      className="btn-optimizer-action"
                    >
                      采纳此建议覆盖到工作流
                    </button>
                  </div>
                </div>
              )}

              {/* 联系方式 */}
              <div className="param-item" style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <label style={{ fontSize: '18px', marginBottom: '16px', color: '#f1f5f9' }}>
                  4. 联系方式（方便我们提供方案）
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label>您的姓名 / 称呼 <span style={{color: '#ef4444'}}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="如：张先生" 
                      className="param-input"
                      style={{ marginTop: '8px', width: '100%' }}
                      value={formData.contactName}
                      onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label>联系电话 / 微信 <span style={{color: '#ef4444'}}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="方便沟通的联系方式" 
                      className="param-input"
                      style={{ marginTop: '8px', width: '100%' }}
                      value={formData.contactMethod}
                      onChange={(e) => setFormData({...formData, contactMethod: e.target.value})}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>所属公司 / 品牌（选填）</label>
                    <input 
                      type="text" 
                      placeholder="您的公司名称" 
                      className="param-input"
                      style={{ marginTop: '8px', width: '100%' }}
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="generate-btn"
                  style={{ opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? '提交中...' : '提交需求调研'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <style jsx global>{`

        /* Hero Banner */
        .hero-banner {
          position: relative;
          background-image: url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center 30%;
          padding: 4.5rem 1.5rem;
          text-align: center;
          border-bottom: 1px solid var(--color-border);
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(11, 17, 32, 0.6) 0%, #0b1120 100%);
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-badge {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          border-radius: 50px;
          padding: 0.3rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .hero-title {
          font-family: var(--font-title);
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 1rem 0;
          line-height: 1.25;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .hero-desc {
          font-size: 1.05rem;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin: 0;
          text-shadow: 0 1px 5px rgba(0,0,0,0.5);
        }

        /* Workspace Layout */
        .main-workspace {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          width: 100%;
          box-sizing: border-box;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 2rem;
          align-items: start;
        }

        /* Sidebar Styling */
        .sidebar-section {
          background-color: var(--color-bg-card);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .section-header h3 {
          font-family: var(--font-title);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 0.4rem 0;
          color: #f1f5f9;
        }

        .section-header p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin: 0 0 1.5rem 0;
        }

        .category-group {
          margin-bottom: 1.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1.25rem;
        }

        .category-group:first-of-type {
          border-top: none;
          padding-top: 0;
        }

        .category-title {
          font-family: var(--font-title);
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 0.15rem 0;
          color: var(--color-accent);
        }

        .category-subtitle {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 0.85rem;
        }

        .types-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .type-item-btn {
          background-color: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 0.75rem 0.95rem;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--color-text-muted);
          width: 100%;
        }

        .type-item-btn:hover {
          background-color: rgba(15, 23, 42, 0.8);
          border-color: rgba(13, 148, 136, 0.4);
          color: #ffffff;
          transform: translateX(3px);
        }

        .type-item-btn.active {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(13, 148, 136, 0.05) 100%);
          border-color: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(13, 148, 136, 0.15);
        }

        .type-btn-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .type-btn-name {
          font-size: 0.85rem;
          font-weight: 600;
          line-height: 1.2;
        }

        .type-btn-ratio {
          font-size: 0.68rem;
          opacity: 0.8;
        }

        .type-btn-arrow {
          font-size: 1rem;
          opacity: 0.5;
          transition: transform 0.2s ease;
        }

        .type-item-btn:hover .type-btn-arrow {
          opacity: 1;
          transform: translateX(2px);
        }

        /* Generation Panel right side */
        .generation-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .config-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .config-header h3 {
          font-family: var(--font-title);
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: #f1f5f9;
        }

        .config-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 1.25rem;
        }

        .parameters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .param-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .param-item label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .param-input, .param-select {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.6rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .param-input:focus, .param-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .param-select option {
          background-color: #0b1120;
          color: white;
        }

        /* Workspace Main Options */
        .workspace-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .mode-tabs {
          display: flex;
          background-color: rgba(15, 23, 42, 0.6);
          padding: 0.3rem;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          margin-bottom: 1.5rem;
        }

        .mode-tab {
          flex: 1;
          background: transparent;
          border: none;
          border-radius: 8px;
          padding: 0.7rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--color-text-muted);
        }

        .mode-tab:hover {
          color: white;
        }

        .mode-tab.active {
          background-color: var(--color-primary);
          color: white;
          box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
        }

        /* Alerts */
        .alert {
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          margin-bottom: 1.25rem;
          font-weight: 500;
        }

        .alert-error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .alert-info {
          background-color: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.3);
          color: #38bdf8;
        }

        /* Upload Area */
        .upload-wrapper {
          margin-bottom: 1.5rem;
        }

        .upload-box-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .upload-dropzone {
          background-color: rgba(15, 23, 42, 0.4);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .upload-dropzone:hover {
          background-color: rgba(15, 23, 42, 0.8);
          border-color: var(--color-primary);
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1rem;
        }

        .upload-icon {
          font-size: 2.25rem;
          margin-bottom: 0.4rem;
        }

        .upload-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .upload-tip {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        .preview-holder {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .preview-holder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .btn-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .btn-remove:hover {
          background: rgba(239, 68, 68, 0.8);
        }

        /* Prompt Optimizer Card */
        .prompt-optimizer-card {
          background-color: rgba(13, 148, 136, 0.04);
          border: 1px dashed rgba(13, 148, 136, 0.3);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .prompt-optimizer-card:hover {
          border-color: rgba(13, 148, 136, 0.6);
          background-color: rgba(13, 148, 136, 0.06);
        }

        .optimizer-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .optimizer-input-group {
          display: flex;
          gap: 0.75rem;
        }

        .optimizer-input-field {
          flex: 1;
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .optimizer-input-field:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .btn-optimizer-action {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.65rem 1.25rem;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-optimizer-action:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .btn-optimizer-action:disabled {
          background-color: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.25);
          cursor: not-allowed;
        }

        .optimized-results-area {
          margin-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .results-tip {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .optimized-suggestions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
        }

        .optimized-suggestion-item {
          background-color: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .optimized-suggestion-item:hover {
          background-color: rgba(15, 23, 42, 0.8);
          border-color: var(--color-primary);
          transform: translateY(-2px);
        }

        .optimized-suggestion-item.active {
          border-color: var(--color-primary);
          background: rgba(13, 148, 136, 0.08);
          box-shadow: 0 0 10px rgba(13, 148, 136, 0.2);
        }

        .suggestion-badge {
          background: rgba(13, 148, 136, 0.15);
          color: #2dd4bf;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          align-self: flex-start;
        }

        .suggestion-text {
          font-size: 0.75rem;
          color: #e2e8f0;
          line-height: 1.4;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 4.2em;
        }

        .suggestion-action {
          font-size: 0.65rem;
          color: var(--color-primary);
          font-weight: 600;
          margin-top: auto;
          text-align: right;
        }

        /* Prompt Box Styling */
        .prompt-area {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .prompt-area label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .prompt-textarea {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1rem;
          color: var(--color-text-main);
          font-family: inherit;
          font-size: 0.9rem;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        /* Extra Settings controls */
        .extra-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.75rem;
        }

        .setting-control {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .setting-control label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .setting-select {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
        }

        /* Action Buttons */
        .btn-action-generate {
          background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1.1rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);
          letter-spacing: 0.02em;
        }

        .btn-action-generate:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.45);
        }

        .btn-action-generate:disabled {
          background: #334155;
          color: #64748b;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        /* Generation Results Card */
        .result-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(13, 148, 136, 0.4);
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 15px 35px rgba(13, 148, 136, 0.15);
        }

        .result-header h3 {
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 700;
          color: #2dd4bf;
          margin: 0 0 0.25rem 0;
        }

        .result-header p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0 0 1.5rem 0;
        }

        .result-body {
          display: grid;
          grid-template-columns: minmax(100px, 480px) 1fr;
          gap: 1.75rem;
          align-items: start;
        }

        .result-image-wrapper {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          background-color: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .result-img {
          width: 100%;
          height: auto;
          display: block;
          max-height: 520px;
          object-fit: contain;
        }

        .result-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .btn-result-action {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.85rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          text-decoration: none;
        }

        .btn-result-action:hover {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .btn-result-action.secondary {
          background-color: rgba(255,255,255,0.05);
          border: 1px solid var(--color-border);
          color: #cbd5e1;
        }

        .btn-result-action.secondary:hover {
          background-color: rgba(255,255,255,0.1);
          color: white;
        }

        /* Gallery Section */
        .gallery-section {
          margin-top: 4rem;
          border-top: 1px solid var(--color-border);
          padding-top: 3rem;
        }

        .gallery-header h3 {
          font-family: var(--font-title);
          font-size: 1.35rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 0.35rem 0;
        }

        .gallery-header p {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin: 0 0 2rem 0;
        }

        .gallery-loader, .gallery-empty {
          text-align: center;
          padding: 3rem;
          background-color: rgba(30, 41, 59, 0.2);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .gallery-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gallery-card:hover {
          background-color: var(--color-bg-card-hover);
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border-color: rgba(13, 148, 136, 0.3);
        }

        .gallery-img-container {
          height: 220px;
          overflow: hidden;
          background-color: rgba(0,0,0,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .gallery-card:hover .gallery-img {
          transform: scale(1.04);
        }

        .gallery-card-info {
          padding: 1rem;
        }

        .gallery-style-badge {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: var(--color-accent);
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 4px;
          padding: 0.15rem 0.4rem;
          display: inline-block;
          margin-bottom: 0.5rem;
        }

        .gallery-prompt-text {
          font-size: 0.8rem;
          color: #e2e8f0;
          line-height: 1.4;
          margin: 0 0 0.85rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 2.4em;
        }

        .gallery-card-actions {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.75rem;
          gap: 0.5rem;
        }

        .gallery-action-link, .gallery-action-btn {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .gallery-action-link:hover, .gallery-action-btn:hover {
          color: white;
          background-color: rgba(255,255,255,0.05);
        }

        /* Responsive breakpoints */
        @media (max-width: 1024px) {
          .workspace-grid {
            grid-template-columns: 1fr;
          }
          
          .hero-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 0.75rem 1rem;
          }

          .site-header {
            position: relative;
          }

          .login-form {
            width: 100%;
          }

          .login-input {
            width: 100%;
          }

          .main-workspace {
            padding: 1.5rem 1rem;
          }

          .result-body {
            grid-template-columns: 1fr;
          }

          .extra-settings, .upload-box-container {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>

    </div>
  );
}
