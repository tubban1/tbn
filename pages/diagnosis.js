import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import axios from 'axios';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DiagnosisPage() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('welcome'); // welcome, collecting_info, diagnosing, report_ready
  const [goal, setGoal] = useState('');
  const [completeness, setCompleteness] = useState(0);
  const [knownFacts, setKnownFacts] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [profileStatus, setProfileStatus] = useState('idle'); // idle, updating, updated, failed

  // UI state
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, report
  const [errorMsg, setErrorMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Header login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. 初始化登录与历史会话状态
  useEffect(() => {
    const storedEmail = localStorage.getItem('timage_email');
    const storedPassword = localStorage.getItem('timage_password');
    const storedVerified = localStorage.getItem('timage_verified') === 'true';

    if (storedEmail && storedPassword && storedVerified) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      handleVerifyEmail(storedEmail, storedPassword);
    }

    // 恢复历史诊断会话
    const storedSessionId = localStorage.getItem('diagnosis_session_id');
    if (storedSessionId) {
      loadSession(storedSessionId);
    }
  }, []);

  // 2. 聊天区域自动滚到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      // 在正在生成/流式输出回复时采用瞬时定位 'auto' 以免滚动重叠或抖动；在非流式载入状态下使用 'smooth' 平滑过渡。
      messagesEndRef.current.scrollIntoView({ behavior: isChatLoading ? 'auto' : 'smooth' });
    }
  }, [messages, isChatLoading]);

  // 3. 轮询后台画像抽取进度
  useEffect(() => {
    let timer = null;
    let pollCount = 0;
    const maxPolls = 8; // 最多轮询 24 秒 (8 次 * 3秒)，完美覆盖后台 Gemini 慢提取生命周期

    const poll = async () => {
      if (!sessionId) return;
      pollCount++;
      try {
        const res = await axios.get(`/api/diagnosis/session?id=${sessionId}`);
        if (res.data?.success) {
          const { session, knownFacts: facts, missingFields: missing } = res.data;
          
          // 每次轮询都静默同步最新数据，让本地快速提取与后台慢提取无缝呈现
          setKnownFacts(facts || {});
          setMissingFields(missing || []);
          setStatus(session.status);

          setCompleteness(prevComp => {
            if (session.completeness > prevComp) {
              const diff = session.completeness - prevComp;
              triggerToast(`✨ 已更新企业画像，完整度 +${diff}%`);
            }
            return session.completeness;
          });

          // 仅在轮询次数达到上限后清除定时器并收尾状态
          if (pollCount >= maxPolls) {
            setProfileStatus('updated');
            if (timer) clearInterval(timer);
          }
        }
      } catch (err) {
        console.error('Polling profile status error:', err);
        if (pollCount >= maxPolls) {
          setProfileStatus('updated'); // 超时也平滑为 updated，保全信心
          if (timer) clearInterval(timer);
        }
      }
    };

    if (profileStatus === 'updating' && sessionId) {
      // 3秒轮询一次
      timer = setInterval(poll, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [profileStatus, sessionId]);

  // 登录/验证邮箱
  const handleVerifyEmail = async (emailToVerify, passwordToVerify) => {
    if (!emailToVerify || !EMAIL_REGEX.test(emailToVerify)) {
      triggerToast('请输入有效的电子邮箱！');
      return;
    }
    if (!passwordToVerify) {
      triggerToast('请输入密码！');
      return;
    }
    setIsCheckingEmail(true);
    setErrorMsg('');
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
      triggerToast(err.response?.data?.error || '登录失败，请检查配置或网络');
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

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // 加载已有的诊断会话
  const loadSession = async (sid) => {
    try {
      const res = await axios.get(`/api/diagnosis/session?id=${sid}`);
      if (res.data?.success) {
        const { session, messages: historyMsgs, knownFacts: facts, missingFields: missing, report: rep } = res.data;
        setSessionId(session.id);
        setStatus(session.status);
        setCompleteness(session.completeness);
        setKnownFacts(facts || {});
        setMissingFields(missing || []);
        setMessages(historyMsgs || []);
        setReport(rep || null);
        setIsRestoredSession(true); // 已恢复历史会话
        setProfileStatus(session.profileStatus || 'idle');
        if (rep) {
          setActiveTab('report');
        } else {
          setActiveTab('profile');
        }
      } else {
        localStorage.removeItem('diagnosis_session_id');
      }
    } catch (err) {
      console.error('Failed to load diagnosis session:', err);
      localStorage.removeItem('diagnosis_session_id');
    }
  };

  // 开启新的诊断会话
  const handleStartDiagnosis = async (selectedGoal) => {
    if (!selectedGoal) {
      triggerToast('请先选择一个诊断目标');
      return;
    }
    setGoal(selectedGoal);
    setIsChatLoading(true);
    setIsRestoredSession(false); // 新会话，设为 false
    setProfileStatus('idle');
    try {
      const res = await axios.post('/api/diagnosis/start', {
        email: email || null,
        goal: selectedGoal
      });
      if (res.data?.success) {
        const { sessionId: newSid, welcomeText, completeness: newComp, knownFacts: facts, missingFields: missing, status: newStatus } = res.data;
        setSessionId(newSid);
        setStatus(newStatus);
        setCompleteness(newComp);
        setKnownFacts(facts || {});
        setMissingFields(missing || []);
        setMessages([{ sender: 'agent', content: welcomeText, created_at: new Date().toISOString() }]);
        setReport(null);
        setActiveTab('profile');
        localStorage.setItem('diagnosis_session_id', newSid);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('启动诊断会话失败，请重试');
      triggerToast('启动诊断会话失败，请重试');
    } finally {
      setIsChatLoading(false);
    }
  };

  // 发送消息
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText || inputText.trim() === '') {
      triggerToast('不能提交空消息');
      return;
    }
    if (isChatLoading) return;

    const userMsg = inputText.trim();
    setInputText('');
    
    // 乐观更新 UI 聊天区
    const tempUserMsg = { sender: 'user', content: userMsg, created_at: new Date().toISOString() };
    const tempAgentMsgId = 'agent_temp_' + Date.now();
    const tempAgentMsg = { id: tempAgentMsgId, sender: 'agent', content: '', created_at: new Date().toISOString() };
    
    setMessages(prev => [...prev, tempUserMsg, tempAgentMsg]);
    setIsChatLoading(true);
    setErrorMsg('');
    // 过滤纯提问、短语或闲聊，避免不必要的画像提取转圈
    const shouldExtract = (text) => {
      if (!text) return false;
      const t = text.trim();
      if (t.length < 5) return false;
      if (/^(你好|您好|在吗|在么|谢谢|感谢|hello|hi|👋)$/i.test(t)) return false;
      if (
        t.includes('？') || 
        t.includes('?') || 
        /^(还需要|还要|需要哪些|哪些信息|是什么|怎么做|如何|为什么|啥|什么)/.test(t) ||
        /(什么信息|哪些信息|还要提供什么|还需要提供什么)/.test(t)
      ) return false;
      return true;
    };

    if (shouldExtract(userMsg)) {
      setProfileStatus('updating'); // 仅对携带事实信息的陈述激活后台画像更新状态
    }

    try {
      const response = await fetch('/api/diagnosis/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMsg
        })
      });

      if (!response.ok) {
        throw new Error('消息发送失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let accumulatedReply = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulatedReply += chunk;
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === tempAgentMsgId) {
                return { ...msg, content: accumulatedReply };
              }
              return msg;
            });
          });
        }
      }
    } catch (err) {
      console.error(err);
      // 清理临时气泡并显示报错
      setMessages(prev => prev.filter(msg => msg.id !== tempAgentMsgId));
      setErrorMsg('网络异常，消息未成功送达。请重新发送。');
      triggerToast('网络连接失败，请重试');
    } finally {
      setIsChatLoading(false);
    }
  };

  // 生成诊断报告
  const handleGenerateReport = async () => {
    if (isReportLoading) return;
    setIsReportLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('/api/diagnosis/report', { sessionId });
      if (res.data?.success) {
        setReport(res.data.report);
        setStatus('report_ready');
        setActiveTab('report');
        triggerToast('🎉 您的企业 AI 转型诊断报告已成功生成！');
        // 重新拉取一次对话历史以更新报告生成的系统提示通知
        const sessionRes = await axios.get(`/api/diagnosis/session?id=${sessionId}`);
        if (sessionRes.data?.success) {
          setMessages(sessionRes.data.messages || []);
        }
      } else {
        triggerToast(res.data?.error || '生成报告失败');
      }
    } catch (err) {
      console.error(err);
      triggerToast('生成报告时发生未知错误，请重试');
    } finally {
      setIsReportLoading(false);
    }
  };

  // 重置/重新诊断
  const handleReset = () => {
    if (window.confirm('您确定要重置当前诊断并开启一份新诊断吗？历史记录将不再在此显示。')) {
      localStorage.removeItem('diagnosis_session_id');
      setSessionId(null);
      setStatus('welcome');
      setCompleteness(0);
      setKnownFacts({});
      setMissingFields([]);
      setMessages([]);
      setReport(null);
      setGoal('');
      setIsRestoredSession(false);
    }
  };

  const goals = [
    '先找能省下来的人工和时间 (把重复活变成自动化)',
    '先找能多赚的客户转化机会 (销售/客服/运营 Agent)',
    '先找老板最容易拍板的 AI 试点 (30天内见到小成果)',
    '我也说不清，让顾问帮我挖隐藏需求'
  ];

  // 渲染诊断维度的显示卡片
  const renderProfileFields = () => {
    const dimensionMapping = {
      basicInfo: { label: '企业规模与场景', desc: '行业、团队、老板关心的业务盘子', icon: '🏢' },
      businessGoal: { label: '可拿回的收益', desc: '省人、省时间、增收、少出错', icon: '💰' },
      currentProcess: { label: '最值得自动化的环节', desc: '重复劳动、卡点、客户等待', icon: '🔄' },
      dataFoundation: { label: '已有数据资产', desc: '表格、系统、客户记录、知识库', icon: '📊' },
      techFoundation: { label: '现有工具底座', desc: 'CRM/ERP/飞书/企微/工单等', icon: '🛠️' },
      orgFoundation: { label: '谁受益谁拍板', desc: '使用人、负责人、预算和试点部门', icon: '👥' },
      riskConstraints: { label: '不能踩的坑', desc: '隐私、合规、权限、人工复核', icon: '⚠️' },
      successCriteria: { label: '老板愿意买单的结果', desc: '30/60/90 天可衡量改善', icon: '🏆' }
    };

    return Object.keys(dimensionMapping).map((key) => {
      const isKnown = !!knownFacts[key];
      const detail = knownFacts[key];
      const meta = dimensionMapping[key];

      return (
        <div key={key} className={`profile-item-card ${isKnown ? 'known' : 'unknown'}`}>
          <div className="card-top">
            <span className="card-icon">{meta.icon}</span>
            <div className="card-info">
              <h4>{meta.label}</h4>
              <p className="card-desc-placeholder">{meta.desc}</p>
            </div>
            <span className={`status-badge ${isKnown ? 'status-known' : 'status-unknown'}`}>
              {isKnown ? '已提取' : '待补充'}
            </span>
          </div>
          {isKnown ? (
            <div className="card-body-text">{detail}</div>
          ) : (
            <div className="card-body-empty">顾问访谈中，请在对话中补充...</div>
          )}
        </div>
      );
    });
  };

  // 根据分数获取成熟度级别
  const getMaturityLevel = (score) => {
    if (score <= 30) return { label: '起步期 (信息化不足)', color: '#ef4444' };
    if (score <= 60) return { label: '探索期 (单点尝试阶段)', color: '#f59e0b' };
    if (score <= 80) return { label: '应用期 (业务流程融入)', color: '#0d9488' };
    return { label: '智能期 (全链路AI协同)', color: '#10b981' };
  };

  return (
    <div className={`app-container ${status !== 'welcome' && sessionId ? 'fixed-workbench' : ''}`}>
      <Head>
        <title>天工创界 | AI 省钱增收机会扫描</title>
        <meta name="description" content="用一次轻量访谈，帮企业老板快速找出可省钱、可增收、可落地的 AI 机会点" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <Header
        title="天工创界"
        subtitle="AI 省钱增收机会扫描"
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

      {showToast && (
        <div className="toast-notification">
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="main-workspace-full">
        {status === 'welcome' || !sessionId ? (
          /* 目标选择欢迎页 */
          <div className="welcome-container">
            <div className="welcome-hero animate-fade-in">
              <span className="welcome-badge">AI OPPORTUNITY SCAN</span>
              <h1>先找能省钱、能多赚的 AI 机会</h1>
              <p className="welcome-description">
                不先卖方案，不让您填长问卷。先用几轮顾问式对话，帮老板把重复耗人的环节、流失的客户机会和 30 天内能试出效果的小切口找出来。
              </p>
            </div>

            <div className="goal-selection-card animate-slide-up">
              <h2>先占一个“便宜”：看看哪里能少花钱、多出单</h2>
              <p className="goal-subtitle">选一个最像您当前处境的入口。Agent 会先给判断，再用很轻的问题把真实需求挖出来：</p>
              
              <div className="goals-grid">
                {goals.map((g, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleStartDiagnosis(g)}
                    className="goal-btn-item"
                    disabled={isChatLoading}
                  >
                    <div className="goal-btn-icon">
                      {idx === 0 && '💸'}
                      {idx === 1 && '📈'}
                      {idx === 2 && '⚡'}
                      {idx === 3 && '🧭'}
                    </div>
                    <div className="goal-btn-content">
                      <span className="goal-title-txt">{g.split(' (')[0]}</span>
                      {g.includes('(') && <span className="goal-desc-txt">{g.slice(g.indexOf('('))}</span>}
                    </div>
                    <span className="goal-arrow">→</span>
                  </button>
                ))}
              </div>

              {isChatLoading && (
                <div className="welcome-loading">
                  <div className="loading-spinner"></div>
                  <span>正在准备机会扫描顾问，请稍候...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 诊断工作台主界面 */
          <div className="workbench-layout">
            
            {/* 左侧分栏：诊断进度和完整度 */}
            <div className="sidebar-col">
              <div className="sidebar-card">
                <h3 className="section-title">机会挖掘进度</h3>
                
                {/* 完整度刻度 */}
                <div className="completeness-block">
                  <div className="completeness-circle-container">
                    <svg viewBox="0 0 100 100" className="progress-circle">
                      <circle cx="50" cy="50" r="42" className="progress-bg"></circle>
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        className="progress-bar"
                        style={{ strokeDasharray: `${2 * Math.PI * 42}`, strokeDashoffset: `${2 * Math.PI * 42 * (1 - completeness / 100)}` }}
                      ></circle>
                    </svg>
                    <div className="progress-text-overlay">
                      <span className="percent-num">{completeness}%</span>
                      <span className="percent-label">机会清晰度</span>
                    </div>
                  </div>
                </div>

                {/* 状态阶段提示 */}
                <div className="state-badge-container">
                  <span className="state-label">当前阶段:</span>
                  <span className={`state-value-tag ${status}`}>
                    {status === 'collecting_info' && '正在找钱和省钱点'}
                    {status === 'clarifying' && '锁定可落地小切口'}
                    {status === 'researching' && '匹配行业可抄作业案例'}
                    {status === 'diagnosing' && '测算机会优先级'}
                    {status === 'report_ready' && '落地清单已就绪'}
                  </span>
                </div>

                <div className="divider"></div>

                {/* 缺失维度提醒 */}
                <div className="missing-list-block">
                  <h4>还差这些就能出落地清单</h4>
                  {missingFields.length > 0 ? (
                    <ul className="missing-fields-list">
                      {missingFields.map((field, idx) => (
                        <li key={idx}>
                          <span className="dot-warn">!</span>
                          <span className="field-name-text">{field.split(' (')[0]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="missing-empty-state">
                      ✨ 机会已经比较清楚，可以生成落地清单！
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <button onClick={handleReset} className="btn-reset-session">
                    🔄 重新找一轮机会
                  </button>
                </div>
              </div>
            </div>

            {/* 中间分栏：聊天访谈区 */}
            <div className="chat-col">
              <div className="chat-container-card">
                <div className="chat-header">
                  <div className="status-indicator"></div>
                  <div>
                    <h4>AI 机会挖掘对话</h4>
                    <span className="chat-sub">先给判断，再用轻问题帮您找可落地收益</span>
                  </div>
                  {completeness >= 80 && (
                    <button 
                      onClick={handleGenerateReport} 
                      className={`btn-action-report pulse-glow ${isReportLoading ? 'loading' : ''}`}
                      disabled={isReportLoading}
                    >
                      {isReportLoading ? '正在整理落地清单...' : report ? '✨ 重新生成机会清单' : '✨ 生成省钱增收清单'}
                    </button>
                  )}
                </div>

                {/* 对话列表 */}
                <div className="messages-scroller">
                  {isRestoredSession && (
                    <div className="restored-session-banner animate-fade-in">
                      <span className="banner-icon">🧭</span>
                      <div className="banner-content">
                        <span className="banner-title">已自动恢复上次机会挖掘</span>
                        <p className="banner-desc">如果这不是当前最想省钱或增收的方向，可以重新开启一轮。</p>
                        <button onClick={handleReset} className="banner-reset-btn">🔄 换个方向重新找机会</button>
                      </div>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble-wrapper ${msg.sender}`}>
                      <div className="message-avatar">
                        {msg.sender === 'agent' ? '🤖' : '👤'}
                      </div>
                      <div className="message-bubble-content">
                        <div className="bubble-meta">
                          {msg.sender === 'agent' ? '机会挖掘顾问' : '您'}
                        </div>
                        <div className="bubble-text">{msg.content}</div>
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="message-bubble-wrapper agent">
                      <div className="message-avatar">🤖</div>
                      <div className="message-bubble-content">
                        <div className="bubble-meta">机会挖掘顾问正在判断哪里最值得做...</div>
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="chat-error-bar">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* 对话底部输入框 */}
                <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="随便说一个最烦、最耗人、最影响成交的环节，例如：报价慢、客户跟进乱、表格填不完..."
                    className="chat-textarea"
                    rows={3}
                    disabled={isChatLoading || isReportLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="input-toolbar">
                    <span className="input-tip">💡 不用写完整方案，说一个“每天最浪费人力的事”就能开始。</span>
                    <button 
                      type="submit" 
                      className="btn-send-message"
                      disabled={isChatLoading || isReportLoading || !inputText.trim()}
                    >
                      发送 ⚡
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 右侧分栏：实时画像/诊断报告 */}
            <div className="profile-col">
              <div className="tabbed-container-card">
                
                {/* 选项卡头部 */}
                <div className="tabs-header">
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  >
                    💰 实时机会画像
                  </button>
                  <button 
                    onClick={() => setActiveTab('report')} 
                    className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
                    disabled={!report && completeness < 80}
                    title={completeness < 80 && !report ? '完整度达到 80% 后解锁报告' : ''}
                  >
                    📊 省钱增收清单 {!report && completeness < 80 && '🔒'}
                  </button>
                </div>

                {/* 选项卡内容区域 */}
                <div className="tab-content-scroller">
                  {activeTab === 'profile' ? (
                    /* 选项卡一：企业画像 */
                    <div className="profile-tab-view animate-fade-in">
                      <div className="profile-intro">
                        <h5>已识别的机会线索</h5>
                        <p>越往下聊，越能看清哪里值得先做、能省多少麻烦、谁最该拍板：</p>
                      </div>

                      {profileStatus === 'updating' && (
                        <div className="profile-status-banner updating animate-fade-in">
                          <span className="spinner-mini"></span>
                          <span>🧭 顾问正在后台把线索整理成机会画像，请继续对话...</span>
                        </div>
                      )}
                      {profileStatus === 'failed' && (
                        <div className="profile-status-banner failed animate-fade-in">
                          <span>⚠️ 部分机会线索整理较慢，您可以继续对话或稍后重试。</span>
                        </div>
                      )}
                      <div className="profile-cards-grid">
                        {renderProfileFields()}
                      </div>
                    </div>
                  ) : (
                    /* 选项卡二：诊断报告 */
                    <div className="report-tab-view animate-fade-in">
                      {report ? (
                        <div className="report-doc-container">
                          
                          {/* 成熟度大仪表盘 */}
                          <div className="report-hero-card">
                            <div className="maturity-score-gauge">
                              <div className="gauge-value">{report.maturityScore}</div>
                              <div className="gauge-label">转型成熟度评分</div>
                            </div>
                            <div className="maturity-level-desc" style={{ color: getMaturityLevel(report.maturityScore).color }}>
                              🎯 级别评定：{getMaturityLevel(report.maturityScore).label}
                            </div>
                            <p className="report-summary-p">{report.summary}</p>
                          </div>

                          {/* 痛点分类 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🚨 核心流程痛点</h4>
                            <div className="pain-points-list-container">
                              {report.painPoints?.map((p, i) => (
                                <div key={i} className="pain-bullet">
                                  <span className="pain-badge">痛点 {i + 1}</span>
                                  <p>{p}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 场景落地机会地图 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🗺️ AI 场景落地机会地图</h4>
                            <div className="table-responsive">
                              <table className="opp-map-table">
                                <thead>
                                  <tr>
                                    <th>推荐落地场景</th>
                                    <th>商业价值</th>
                                    <th>落地难度</th>
                                    <th>优先级</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.opportunityMap?.map((opp, i) => (
                                    <tr key={i}>
                                      <td className="opp-title">{opp.title}</td>
                                      <td><span className={`eval-badge val-${opp.value}`}>{opp.value}</span></td>
                                      <td><span className={`eval-badge cmp-${opp.complexity}`}>{opp.complexity}</span></td>
                                      <td><span className={`pri-badge pri-${opp.priority}`}>{opp.priority}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 推荐 Agents 模块 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🤖 推荐智能体 (Agents) 设计</h4>
                            <div className="agents-grid-container">
                              {report.recommendedAgents?.map((agent, i) => (
                                <div key={i} className="agent-rec-card">
                                  <h5>{agent.name}</h5>
                                  <p className="agent-desc-para"><strong>核心功能：</strong>{agent.description}</p>
                                  <p className="agent-integ-para"><strong>系统对接：</strong>{agent.integration}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 30-60-90 天路线图 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">📅 30/60/90 天落地路线图</h4>
                            <div className="timeline-container">
                              <div className="timeline-step">
                                <div className="timeline-badge-day">Day 30</div>
                                <div className="timeline-content-card">
                                  <h6>准备与试点阶段</h6>
                                  <p>{report.roadmap30_60_90?.day30}</p>
                                </div>
                              </div>
                              <div className="timeline-step">
                                <div className="timeline-badge-day">Day 60</div>
                                <div className="timeline-content-card">
                                  <h6>核心实施与集成阶段</h6>
                                  <p>{report.roadmap30_60_90?.day60}</p>
                                </div>
                              </div>
                              <div className="timeline-step">
                                <div className="timeline-badge-day">Day 90</div>
                                <div className="timeline-content-card">
                                  <h6>全面上线与效益推广</h6>
                                  <p>{report.roadmap30_60_90?.day90}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 数据/系统准备要求 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">💾 必备数据与接口准备</h4>
                            <ul className="rep-bullet-ul">
                              {report.dataRequirements?.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 风险合规提醒 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">⚠️ 潜在落地风险与合规建议</h4>
                            <ul className="rep-bullet-ul">
                              {report.risks?.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 下一步深聊问题 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🧭 建议专家深度沟通问题</h4>
                            <ul className="rep-bullet-ul-accent">
                              {report.nextActions?.map((act, i) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ul>
                          </div>

                        </div>
                      ) : (
                        <div className="report-unlocked-state">
                          <span className="unlocked-icon">🔒</span>
                          <h5>省钱增收清单未生成</h5>
                          <p>继续把最耗人、最慢、最容易丢单的环节讲清楚。机会清晰度达到 80% 后，即可生成 30/60/90 天落地清单。</p>
                          <div className="unlocked-progress-bar">
                            <div className="unlocked-progress-fill" style={{ width: `${completeness}%` }}></div>
                          </div>
                          <span>当前信息收集度: {completeness} / 80 %</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </main>

      {/* 精细化设计的样式系统 */}
      <style jsx global>{`
        /* 默认根容器，支持欢迎页自然流动与滚动 */
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #0b1120;
        }

        /* 仅在进入访谈工作台后，强行锁定为浏览器视口高度 */
        .app-container.fixed-workbench {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
        }

        .main-workspace-full {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #0b1120;
          position: relative;
        }

        /* 仅在工作台状态下锁死高度，防止内容撑开父容器 */
        .app-container.fixed-workbench .main-workspace-full {
          height: 0;
          overflow: hidden;
        }

        /* 动画库 */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(13, 148, 136, 0); }
          100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Toast 提示 */
        .toast-notification {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(45, 212, 191, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(45, 212, 191, 0.2);
          border-radius: 50px;
          padding: 10px 24px;
          z-index: 1000;
          color: #f8fafc;
          font-weight: 500;
          font-size: 0.85rem;
          animation: fadeIn 0.2s ease, slideUp 0.2s ease;
        }

        /* 欢迎页排版 */
        .welcome-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 4rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .welcome-hero {
          margin-bottom: 2.5rem;
        }

        .welcome-badge {
          background: rgba(13, 148, 136, 0.15);
          border: 1px solid rgba(13, 148, 136, 0.4);
          color: #2dd4bf;
          border-radius: 50px;
          padding: 0.3rem 0.95rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 1.2rem;
          display: inline-block;
        }

        .welcome-hero h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.8rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 1rem 0;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff 40%, #0d9488 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome-description {
          font-size: 1.05rem;
          color: #94a3b8;
          line-height: 1.6;
          max-width: 720px;
          margin: 0 auto;
        }

        /* 目标卡片选择 */
        .goal-selection-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 2.5rem;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .goal-selection-card h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.4rem;
          margin: 0 0 0.5rem 0;
          color: #f8fafc;
        }

        .goal-subtitle {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 2rem;
        }

        .goals-grid {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .goal-btn-item {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.1rem 1.5rem;
          display: flex;
          align-items: center;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #94a3b8;
          width: 100%;
        }

        .goal-btn-item:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%);
          border-color: rgba(13, 148, 136, 0.4);
          transform: translateY(-2px);
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.1);
        }

        .goal-btn-icon {
          font-size: 1.8rem;
          margin-right: 1.25rem;
          opacity: 0.85;
        }

        .goal-btn-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .goal-title-txt {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        .goal-desc-txt {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.2rem;
        }

        .goal-arrow {
          font-size: 1.2rem;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
          color: #2dd4bf;
          margin-left: 1rem;
        }

        .goal-btn-item:hover .goal-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .welcome-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
          font-size: 0.85rem;
          color: #0d9488;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(13, 148, 136, 0.2);
          border-top-color: #0d9488;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 诊断工作台网格 */
        .workbench-layout {
          display: grid;
          grid-template-columns: 280px 1fr 420px;
          gap: 1.25rem;
          padding: 1.25rem;
          flex: 1;
          height: calc(100vh - 73px); /* 扣除 Header 高度 */
          box-sizing: border-box;
          overflow: hidden;
        }

        @media (max-width: 1200px) {
          .workbench-layout {
            grid-template-columns: 240px 1fr 360px;
          }
        }

        @media (max-width: 992px) {
          .workbench-layout {
            grid-template-columns: 1fr;
            height: auto;
            overflow: auto;
          }
        }

        /* 侧边栏及卡片 */
        .sidebar-col, .chat-col, .profile-col {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        @media (max-width: 992px) {
          .sidebar-col, .chat-col, .profile-col {
            height: auto;
            overflow: visible;
          }
        }

        .sidebar-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
        }

        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 1.2rem 0;
          letter-spacing: 0.02em;
          border-left: 3px solid #0d9488;
          padding-left: 8px;
        }

        /* 圆环进度条 */
        .completeness-block {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .completeness-circle-container {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .progress-circle {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .progress-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.03);
          stroke-width: 6px;
        }

        .progress-bar {
          fill: none;
          stroke: url(#cyan-gradient); /* 我们使用普通的颜色先兜底 */
          stroke: #0d9488;
          stroke-width: 6px;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-text-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .percent-num {
          font-family: 'Outfit', sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }

        .percent-label {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 4px;
          font-weight: 500;
        }

        /* 状态阶段 */
        .state-badge-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.4);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          margin-bottom: 1.25rem;
        }

        .state-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        .state-value-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: #38bdf8;
        }

        .state-value-tag.report_ready {
          color: #10b981;
        }

        .state-value-tag.diagnosing {
          color: #f59e0b;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: 1.25rem;
        }

        /* 缺失列表 */
        .missing-list-block h4 {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0 0 0.75rem 0;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .missing-fields-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .missing-fields-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #64748b;
          background: rgba(239, 68, 68, 0.02);
          border: 1px dashed rgba(239, 68, 68, 0.1);
          padding: 6px 10px;
          border-radius: 6px;
        }

        .dot-warn {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .field-name-text {
          flex: 1;
        }

        .missing-empty-state {
          font-size: 0.75rem;
          color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 10px;
          border-radius: 8px;
          text-align: center;
          font-weight: 500;
        }

        .btn-reset-session {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #64748b;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
        }

        .btn-reset-session:hover {
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
          background: rgba(239, 68, 68, 0.05);
        }

        /* 中间聊天区样式 */
        .chat-container-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.2);
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0d9488;
          box-shadow: 0 0 10px #0d9488;
        }

        .chat-header h4 {
          margin: 0;
          font-size: 0.95rem;
          color: #ffffff;
        }

        .chat-sub {
          font-size: 0.7rem;
          color: #64748b;
          display: block;
        }

        .btn-action-report {
          margin-left: auto;
          background: #0d9488;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-action-report:hover:not(:disabled) {
          background: #0f766e;
          transform: translateY(-1px);
        }

        .pulse-glow {
          animation: pulse 2s infinite;
        }

        /* 气泡聊天滚动区 */
        .messages-scroller {
          flex: 1;
          padding: 1.25rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          background: rgba(15, 23, 42, 0.1);
        }

        .message-bubble-wrapper {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .message-bubble-wrapper.agent {
          align-self: flex-start;
        }

        .message-bubble-wrapper.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .message-bubble-wrapper.agent .message-avatar {
          border-color: rgba(13, 148, 136, 0.3);
          background: rgba(13, 148, 136, 0.15);
        }

        .message-bubble-wrapper.user .message-avatar {
          border-color: rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.15);
        }

        .message-bubble-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bubble-meta {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 500;
        }

        .message-bubble-wrapper.user .bubble-meta {
          text-align: right;
        }

        .bubble-text {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.5;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .message-bubble-wrapper.agent .bubble-text {
          border-top-left-radius: 2px;
        }

        .message-bubble-wrapper.user .bubble-text {
          background: linear-gradient(135deg, rgba(20, 30, 55, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
          border-color: rgba(13, 148, 136, 0.15);
          color: #ffffff;
          border-top-right-radius: 2px;
        }

        .chat-error-bar {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          text-align: center;
        }

        /* 正在输入标志 */
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          align-self: flex-start;
          width: fit-content;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #64748b;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* 输入底栏 */
        .chat-input-wrapper {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.3);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-textarea {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 10px 14px;
          color: white;
          font-family: inherit;
          font-size: 0.85rem;
          line-height: 1.4;
          resize: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .chat-textarea:focus {
          outline: none;
          border-color: #0d9488;
        }

        .input-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-tip {
          font-size: 0.68rem;
          color: #64748b;
        }

        .btn-send-message {
          background: #0d9488;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-send-message:hover:not(:disabled) {
          background: #0f766e;
          transform: translateY(-1px);
        }

        .btn-send-message:disabled {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
        }

        /* 右侧分栏 Tab 卡片 */
        .tabbed-container-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .tabs-header {
          display: flex;
          background: rgba(15, 23, 42, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 12px 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }

        .tab-btn:hover:not(:disabled) {
          color: #f1f5f9;
        }

        .tab-btn.active {
          color: #0d9488;
          border-bottom-color: #0d9488;
          background: rgba(255, 255, 255, 0.01);
        }

        .tab-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tab-content-scroller {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          box-sizing: border-box;
        }

        /* 实时画像标签页 */
        .profile-intro {
          margin-bottom: 1rem;
        }

        .profile-intro h5 {
          margin: 0 0 4px 0;
          font-size: 0.85rem;
          color: #f1f5f9;
        }

        .profile-intro p {
          margin: 0;
          font-size: 0.7rem;
          color: #64748b;
        }

        .profile-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .profile-item-card {
          border-radius: 12px;
          padding: 10px 12px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-item-card.unknown {
          background: rgba(15, 23, 42, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .profile-item-card.known {
          background: rgba(13, 148, 136, 0.02);
          border: 1px solid rgba(13, 148, 136, 0.15);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.02);
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-icon {
          font-size: 1.1rem;
        }

        .card-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .card-info h4 {
          margin: 0;
          font-size: 0.8rem;
          color: #e2e8f0;
        }

        .card-desc-placeholder {
          font-size: 0.65rem;
          color: #64748b;
          margin: 1px 0 0 0;
        }

        .status-badge {
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 4px;
          padding: 2px 6px;
        }

        .status-known {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-unknown {
          background: rgba(255, 255, 255, 0.02);
          color: #64748b;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .card-body-text {
          font-size: 0.75rem;
          color: #f1f5f9;
          line-height: 1.45;
          background: rgba(15, 23, 42, 0.4);
          padding: 8px 10px;
          border-radius: 6px;
        }

        .card-body-empty {
          font-size: 0.7rem;
          color: #64748b;
          font-style: italic;
          padding-left: 2px;
        }

        /* 未解锁报告状态 */
        .report-unlocked-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .unlocked-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .report-unlocked-state h5 {
          font-size: 0.95rem;
          margin: 0 0 8px 0;
          color: #f1f5f9;
        }

        .report-unlocked-state p {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .unlocked-progress-bar {
          background: rgba(255, 255, 255, 0.04);
          height: 6px;
          border-radius: 10px;
          width: 80%;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .unlocked-progress-fill {
          background: #0d9488;
          height: 100%;
          transition: width 0.3s ease;
        }

        .report-unlocked-state span {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 诊断报告文档样式 */
        .report-doc-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-bottom: 2rem;
        }

        .report-hero-card {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.06) 0%, rgba(15, 23, 42, 0.4) 100%);
          border: 1px solid rgba(13, 148, 136, 0.25);
          border-radius: 16px;
          padding: 1.25rem;
          text-align: center;
        }

        .maturity-score-gauge {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 8px;
        }

        .gauge-value {
          font-family: 'Outfit', sans-serif;
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }

        .gauge-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .maturity-level-desc {
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .report-summary-p {
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
          text-align: left;
          background: rgba(15, 23, 42, 0.5);
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .report-section-block {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1.25rem;
        }

        .rep-sec-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 10px 0;
          letter-spacing: 0.02em;
        }

        .pain-points-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pain-bullet {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: rgba(239, 68, 68, 0.03);
          border: 1px solid rgba(239, 68, 68, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
        }

        .pain-badge {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          align-self: flex-start;
        }

        .pain-bullet p {
          margin: 0;
          font-size: 0.75rem;
          color: #e2e8f0;
          line-height: 1.45;
        }

        /* 机会地图表格 */
        .opp-map-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
          text-align: left;
        }

        .opp-map-table th {
          color: #64748b;
          font-weight: 600;
          padding: 6px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .opp-map-table td {
          padding: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #cbd5e1;
        }

        .opp-title {
          font-weight: 600;
          color: #f1f5f9;
        }

        .eval-badge {
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 4px;
          padding: 2px 6px;
        }

        .eval-badge.val-高 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .eval-badge.val-中 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .eval-badge.val-低 { background: rgba(255, 255, 255, 0.05); color: #94a3b8; }

        .eval-badge.cmp-低 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .eval-badge.cmp-中 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .eval-badge.cmp-高 { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        .pri-badge {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .pri-badge.pri-P0 { color: #f87171; }
        .pri-badge.pri-P1 { color: #f59e0b; }
        .pri-badge.pri-P2 { color: #38bdf8; }

        /* Agents 设计推荐 */
        .agents-grid-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .agent-rec-card {
          background: rgba(13, 148, 136, 0.02);
          border: 1px solid rgba(13, 148, 136, 0.12);
          padding: 10px 12px;
          border-radius: 10px;
        }

        .agent-rec-card h5 {
          margin: 0 0 6px 0;
          font-size: 0.8rem;
          color: #2dd4bf;
          font-weight: 700;
        }

        .agent-desc-para, .agent-integ-para {
          margin: 0 0 4px 0;
          font-size: 0.72rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .agent-desc-para strong, .agent-integ-para strong {
          color: #e2e8f0;
          font-weight: 600;
        }

        /* 路线图时间轴 */
        .timeline-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          padding-left: 10px;
        }

        .timeline-container::before {
          content: '';
          position: absolute;
          left: 35px;
          top: 15px;
          bottom: 15px;
          width: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        .timeline-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .timeline-badge-day {
          width: 50px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(13, 148, 136, 0.3);
          color: #2dd4bf;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 6px;
          padding: 3px 0;
          text-align: center;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(13, 148, 136, 0.05);
        }

        .timeline-content-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          padding: 8px 12px;
          flex: 1;
        }

        .timeline-content-card h6 {
          margin: 0 0 4px 0;
          font-size: 0.78rem;
          color: #f1f5f9;
          font-weight: 600;
        }

        .timeline-content-card p {
          margin: 0;
          font-size: 0.72rem;
          color: #94a3b8;
          line-height: 1.45;
        }

        /* 列表元素 */
        .rep-bullet-ul {
          padding-left: 1rem;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rep-bullet-ul li {
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .rep-bullet-ul-accent {
          padding-left: 1rem;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rep-bullet-ul-accent li {
          font-size: 0.75rem;
          color: #f59e0b;
          line-height: 1.4;
        }

        /* 恢复会话提示横幅 */
        .restored-session-banner {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(13, 148, 136, 0.25);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .banner-icon {
          font-size: 1.4rem;
          background: rgba(13, 148, 136, 0.1);
          padding: 6px;
          border-radius: 8px;
          line-height: 1;
        }

        .banner-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
        }

        .banner-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #2dd4bf;
        }

        .banner-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0 0 8px 0;
          line-height: 1.4;
          text-align: left;
        }

        .banner-reset-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 0.72rem;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .banner-reset-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }

        /* 画像更新状态条 */
        .profile-status-banner {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          line-height: 1.4;
          text-align: left;
        }

        .profile-status-banner.updating {
          background: rgba(13, 148, 136, 0.08);
          border: 1px solid rgba(13, 148, 136, 0.2);
          color: #2dd4bf;
        }

        .profile-status-banner.failed {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .spinner-mini {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(45, 212, 191, 0.3);
          border-top-color: #2dd4bf;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
