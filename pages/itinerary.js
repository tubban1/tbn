import { useState, useEffect } from 'react';
import Head from 'next/head';
import axios from 'axios';
import Header from '../components/Header';


export default function Itinerary() {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Form State
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [people, setPeople] = useState(2);
  const [budget, setBudget] = useState('舒适');
  const [startDate, setStartDate] = useState('');
  
  const [pace, setPace] = useState('标准');
  const [travelType, setTravelType] = useState('深度游');
  const [transport, setTransport] = useState('公共交通');
  const [interests, setInterests] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [itineraryResult, setItineraryResult] = useState(null);

  useEffect(() => {
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
      setErrorMessage(err.response?.data?.error || '登录失败，请检查邮箱和密码！');
      setEmailStatus('none');
      localStorage.removeItem('timage_verified');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleGenerate = async () => {
    if (!destination) {
      setErrorMessage('请输入目的地');
      return;
    }
    if (!days || days < 1) {
      setErrorMessage('请输入有效的出行天数');
      return;
    }
    
    setErrorMessage('');
    setInfoMessage('');
    setIsGenerating(true);
    setItineraryResult(null);

    try {
      const response = await axios.post('/api/itinerary/generate', {
        destination,
        days,
        people,
        budget,
        startDate,
        pace,
        travelType,
        transport,
        interests,
        email: emailStatus === 'verified' ? email : undefined
      });

      if (response.data?.success) {
        setItineraryResult(response.data.itinerary);
        setInfoMessage('🎉 行程生成成功！');
      } else {
        setErrorMessage(response.data?.error || '生成失败');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || '生成行程时发生异常');
    } finally {
      setIsGenerating(false);
      // refresh credits
      if (emailStatus === 'verified') {
        handleVerifyEmail(email, password);
      }
    }
  };

  const copyFullItinerary = () => {
    if (!itineraryResult) return;
    
    let text = `# ${itineraryResult.title}\n\n`;
    text += `${itineraryResult.summary}\n\n`;
    
    itineraryResult.days?.forEach(day => {
      text += `## Day ${day.day}: ${day.theme}\n`;
      day.items?.forEach(item => {
        text += `- **${item.time}** | ${item.activity}\n`;
        text += `  说明: ${item.description}\n`;
        if (item.transport) text += `  交通: ${item.transport}\n`;
        if (item.tips) text += `  提示: ${item.tips}\n`;
      });
      text += '\n';
    });
    
    if (itineraryResult.tips && itineraryResult.tips.length > 0) {
      text += `## 行前提示\n`;
      itineraryResult.tips.forEach(tip => {
        text += `- ${tip}\n`;
      });
    }

    navigator.clipboard.writeText(text).catch(console.error);
    setInfoMessage('已复制完整行程到剪贴板！');
  };

  return (
    <div className="workbench-container">
      <Head>
        <title>AI 智能行程规划 | 天工创界</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      <Header 
        title="AI 智能行程规划" 
        subtitle="结构化旅行管家" 
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        emailStatus={emailStatus}
        credits={credits}
        onVerifyEmail={() => handleVerifyEmail(email, password)}
        onLogout={() => { setEmailStatus('none'); localStorage.removeItem('timage_verified'); }}
      />

      <main className="main-workspace">
        {/* Alerts */}
        {errorMessage && (
          <div className="alert alert-error">
            ⚠️ {errorMessage}
          </div>
        )}
        {infoMessage && (
          <div className="alert alert-info">
            ℹ️ {infoMessage}
          </div>
        )}

        <div className="workspace-grid" style={{ gridTemplateColumns: 'minmax(300px, 320px) minmax(300px, 320px) 1fr' }}>
          
          {/* Left Column: Input Requirements */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3>📍 基础需求</h3>
              <p>输入本次旅行的核心信息</p>
            </div>

            <div className="category-group">
              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">目的地 (必填)</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="如：九寨沟、京都、川西..."
                  className="input"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">出行天数 (必填)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                  className="input"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">出行人数</label>
                <input
                  type="number"
                  min="1"
                  value={people}
                  onChange={(e) => setPeople(parseInt(e.target.value) || 1)}
                  className="input"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">预算范围</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="经济">经济穷游</option>
                  <option value="舒适">舒适轻奢</option>
                  <option value="高端">高端定制</option>
                  <option value="不限">不限预算</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">出发日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff', colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Center Column: Preferences */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3>⚙️ 偏好设定</h3>
              <p>定制您的旅行风格与节奏</p>
            </div>

            <div className="category-group">
              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">行程节奏</label>
                <select
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="轻松">轻松悠闲 (适合老人小孩)</option>
                  <option value="标准">标准打卡 (兼顾景点与休息)</option>
                  <option value="紧凑">特种兵式 (紧凑高效)</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">旅行类型</label>
                <select
                  value={travelType}
                  onChange={(e) => setTravelType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="深度游">人文深度游</option>
                  <option value="亲子">亲子度假</option>
                  <option value="情侣">情侣蜜月</option>
                  <option value="朋友">朋友欢聚</option>
                  <option value="摄影">风光摄影</option>
                  <option value="美食">美食巡礼</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="category-title">交通方式</label>
                <select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="公共交通">公共交通 (地铁/公交)</option>
                  <option value="自驾">自驾游</option>
                  <option value="包车">包车游</option>
                  <option value="不限">不限 / 混合交通</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="category-title">补充兴趣点 (可选)</label>
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="例如：必吃当地火锅、想去小众咖啡馆..."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                />
              </div>


              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !destination || !days}
                className="btn-optimizer-action"
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}
              >
                {isGenerating ? '⏳ AI规划中 (约15秒)...' : '🚀 智能生成行程'}
              </button>
            </div>
          </div>

          {/* Right Column: Generation Result */}
          <div className="generation-section">
            <div className="config-card" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
              
              {!itineraryResult && !isGenerating && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
                  <h3 style={{ margin: 0, color: '#e2e8f0' }}>等待生成行程</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>在左侧输入需求并点击生成</p>
                </div>
              )}

              {isGenerating && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>🧭</div>
                  <h3 style={{ margin: 0, color: '#38bdf8' }}>AI正在为您定制完美路线...</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>分析目的地特性、计算交通耗时、优选活动安排</p>
                </div>
              )}

              {itineraryResult && !isGenerating && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Header */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.5rem' }}>{itineraryResult.title}</h2>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>{itineraryResult.summary}</p>
                    </div>
                    <button 
                      onClick={copyFullItinerary}
                      style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid #38bdf8', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    >
                      📄 复制完整行程
                    </button>
                  </div>

                  {/* Days */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {itineraryResult.days?.map((day, idx) => (
                      <div key={idx} style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: '#0d9488', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Day {day.day}</div>
                          <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.1rem' }}>{day.theme}</h4>
                        </div>
                        
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {day.items?.map((item, iIdx) => (
                              <div key={iIdx} style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ width: '60px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold', paddingTop: '2px' }}>{item.time}</div>
                                <div style={{ flex: 1, borderLeft: '2px solid rgba(56, 189, 248, 0.2)', paddingLeft: '1rem' }}>
                                  <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>{item.activity}</div>
                                  <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '6px', lineHeight: '1.5' }}>{item.description}</div>
                                  
                                  {(item.transport || item.tips) && (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {item.transport && <div><span style={{ color: '#94a3b8' }}>🚕 交通:</span> <span style={{ color: '#e2e8f0' }}>{item.transport}</span></div>}
                                      {item.tips && <div><span style={{ color: '#94a3b8' }}>💡 提示:</span> <span style={{ color: '#e2e8f0' }}>{item.tips}</span></div>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Image Prompts */}
                  {itineraryResult.imagePrompts && itineraryResult.imagePrompts.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.1rem' }}>🖼️ 每日配图 (生图提示词)</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {itineraryResult.imagePrompts.map((img, idx) => (
                          <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', border: '1px dashed rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>Day {img.day} · {img.title}</div>
                            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{img.prompt}</div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(img.prompt).catch(console.error);
                                setInfoMessage(`已复制 Day ${img.day} 配图提示词`);
                              }}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              复制提示词去生图
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {itineraryResult.tips && itineraryResult.tips.length > 0 && (
                    <div style={{ marginTop: '1rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '1.25rem' }}>
                      <h3 style={{ margin: '0 0 0.75rem 0', color: '#f59e0b', fontSize: '1rem' }}>⚠️ 行前综合提示</h3>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {itineraryResult.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <style jsx global>{`
        .workbench-container {
          min-height: 100vh;
          background-color: #08110f;
          color: #e2e8f0;
          font-family: var(--font-body), sans-serif;
        }

        .main-workspace {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          width: 100%;
          box-sizing: border-box;
        }

        .workspace-grid {
          display: grid;
          gap: 2rem;
          align-items: start;
        }

        .sidebar-section {
          background-color: #101b1d;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .section-header h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 0.4rem 0;
          color: #f1f5f9;
        }

        .section-header p {
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.4;
          margin: 0 0 1.5rem 0;
        }

        .category-group {
          display: flex;
          flex-direction: column;
        }

        .category-title {
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0 0 0.4rem 0;
          color: #2dd4bf;
          display: block;
        }

        .input-group input:focus, .input-group select:focus, .input-group textarea:focus {
          outline: none;
          border-color: #0d9488 !important;
        }

        .btn-optimizer-action:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
        }
        
        .btn-optimizer-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generation-section {
          display: flex;
          flex-direction: column;
        }

        .config-card {
          background-color: #101b1d;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
        }

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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
