import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';
import dynamic from 'next/dynamic';

const SingularityLoader = dynamic(() => import('../components/SingularityLoader'), {
  ssr: false
});

const ImageMarkupModal = dynamic(() => import('../components/ImageMarkupModal'), {
  ssr: false
});

export default function MultiImage() {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image'
  const [unifiedStyle, setUnifiedStyle] = useState('Cinematic 电影感摄影');

  const [copyText, setCopyText] = useState('');
  const [baseImage, setBaseImage] = useState(null);
  const [baseImagePreview, setBaseImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [scenes, setScenes] = useState([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  
  const [editingImageIdx, setEditingImageIdx] = useState(false);

  const EMAIL_REGEX = /^[^s@]+@[^s@]+\.[^s@]+$/;
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem('timage_email');
    const storedVerified = localStorage.getItem('timage_verified') === 'true';

    if (storedEmail && storedVerified) {
      setEmail(storedEmail);
      handleVerifyEmail(storedEmail);
    }
  }, []);

  const handleVerifyEmail = async (emailToVerify) => {
    if (!emailToVerify || !EMAIL_REGEX.test(emailToVerify)) {
      setErrorMessage('请输入有效的电子邮箱！');
      return;
    }
    setIsCheckingEmail(true);
    setErrorMessage('');
    try {
      const response = await axios.post('/api/timage/pre-check', { email: emailToVerify });
      if (response.data?.success) {
        setEmailStatus('verified');
        setCredits(response.data.credits);
        localStorage.setItem('timage_email', emailToVerify);
        localStorage.setItem('timage_verified', 'true');
        loadHistory(emailToVerify);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || '登录失败，请检查数据库配置或网络');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('timage_email');
    localStorage.removeItem('timage_verified');
    setEmail('');
    setEmailStatus('none');
    setCredits(0);
    setHistoryList([]);
  };

  const loadHistory = async (userEmail) => {
    if (!userEmail) return;
    setIsLoadingHistory(true);
    try {
      const res = await axios.post('/api/timage/history', { email: userEmail, limit: 12 });
      if (res.data?.success) {
        setHistoryList(res.data.images || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Parse long text into scenes
  const handleExtractScenes = async () => {
    if (!copyText.trim()) {
      setErrorMessage('请输入长文案或文档内容！');
      return;
    }
    setIsExtracting(true);
    setErrorMessage('');
    
    try {
      // We will create a new endpoint /api/timage/extract-scenes
      const response = await axios.post('/api/timage/extract-scenes', { 
        text: copyText,
        unifiedStyle: activeTab === 'text' ? unifiedStyle : null
      });
      if (response.data?.success) {
        setScenes(response.data.scenes);
        setInfoMessage(`成功解析出 ${response.data.scenes.length} 个分镜画面！`);
      } else {
        setErrorMessage(response.data?.error || '解析失败');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || '网络错误，无法解析文案');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateAll = async () => {
    if (scenes.length === 0) return;
    
    setIsGenerating(true);
    setErrorMessage('');
    setInfoMessage('');
    
    // Initialize results with placeholders
    setResults(new Array(scenes.length).fill(null));
    
    const promises = scenes.map(async (scene, idx) => {
      try {
        if (activeTab === 'image') {
          if (!baseImage) {
            updateResult(idx, 'error');
            return;
          }
          // Mode 2: Base image + local modify (Image-to-Image)
          const formData = new FormData();
          formData.append('prompt', scene.prompt);
          if (email) formData.append('email', email);
          formData.append('size', '1024x1024'); // default
          formData.append('image', baseImage);
          
          const res = await axios.post('/api/timage/edit', formData);
          if (res.data?.success) {
            updateResult(idx, res.data.freeimageUrl);
          } else {
            updateResult(idx, 'error');
          }
        } else {
          // Mode 1: Text to Image (Unified Style)
          const res = await axios.post('/api/timage/generate', {
            prompt: scene.prompt,
            size: '1024x1024',
            email
          });
          if (res.data?.success) {
            updateResult(idx, res.data.freeimageUrl);
          } else {
            updateResult(idx, 'error');
          }
        }
      } catch (err) {
        updateResult(idx, 'error');
      }
    });

    await Promise.all(promises);
    setIsGenerating(false);
    setInfoMessage('✅ 批量生成完毕！');
    if (email) {
      const lastRes = await axios.post('/api/timage/pre-check', { email });
      if (lastRes.data?.success) setCredits(lastRes.data.credits);
      loadHistory(email);
    }
  };

  const updateResult = (idx, url) => {
    setResults(prev => {
      const newRes = [...prev];
      newRes[idx] = url;
      return newRes;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBaseImage(file);
      setBaseImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setBaseImage(null);
    setBaseImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container">
      <Head>
        <title>天工创界 | 智能分镜批量多图生成</title>
      </Head>

      
      {/* Header */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo-section">
            <div>
              <h1 className="logo-title">天工创界 | 多图智能生成引擎</h1>
            </div>
          </div>

          <div className="user-section">
            {emailStatus === 'verified' ? (
              <div className="user-badge">
                <span className="user-email">✉️ {email}</span>
                <span className="user-credits">💎 剩余额度: <strong>{credits}</strong></span>
                <button onClick={() => setShowRechargeModal(true)} className="btn-recharge">⚡ 充值请联系</button>
                <button onClick={handleLogout} className="btn-logout">退出</button>
              </div>
            ) : (
              <div className="login-form">
                <input
                  type="email"
                  placeholder="输入邮箱登录 / 自动注册..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                />
                <button
                  onClick={() => handleVerifyEmail(email)}
                  disabled={isCheckingEmail}
                  className="btn-login"
                >
                  {isCheckingEmail ? '登录中...' : '登录 / 注册'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>


      <div className="main-content">
        <div className="mode-tabs">
          <button
            onClick={() => setActiveTab('text')}
            className={`mode-tab ${activeTab === 'text' ? 'active' : ''}`}
          >
            📝 基于文案：纯分镜大片 (自动保持统一风格)
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`mode-tab ${activeTab === 'image' ? 'active' : ''}`}
          >
            📸 基于底图：单图局部衍生 (同一张图的多图输出)
          </button>
        </div>

        <div className="card">
          <h3>1. 输入长文案 / 故事文档</h3>
          <p className="hint">AI会自动阅读长文并提取分镜画面</p>
          <textarea 
            value={copyText} 
            onChange={e => setCopyText(e.target.value)}
            placeholder="粘贴您的公众号推文、小说故事或多图需求描述..."
            rows={6}
            className="input-textarea"
          />
          
          {activeTab === 'text' && (
            <div className="upload-section">
              <h3>2. 选择统一风格</h3>
              <p className="hint">我们将指示AI引擎在提取的所有分镜中强制保持这一统一风格，确保输出的多图具有连贯性。</p>
              <select value={unifiedStyle} onChange={(e) => setUnifiedStyle(e.target.value)} className="style-select">
                <option value="Cinematic 电影感摄影">Cinematic 电影感真实摄影</option>
                <option value="Studio Ghibli 宫崎骏动画风格">Studio Ghibli 宫崎骏日系动画风格</option>
                <option value="3D Pixar 皮克斯3D渲染">3D Pixar 皮克斯3D卡通渲染</option>
                <option value="Watercolor 浪漫水彩插画">Watercolor 唯美水彩插画</option>
                <option value="Cyberpunk 赛博朋克风">Cyberpunk 霓虹赛博朋克风</option>
                <option value="Minimalist Flat Design 极简扁平化插画">Minimalist Flat 极简扁平化</option>
              </select>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="upload-section">
              <h3>2. 上传基础参考图</h3>
              <p className="hint">请上传一张底图。AI 将基于这张同一图片，结合上述分镜文案，为您生成多张局部被修改/重绘的不同画面！</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} accept="image/*" />
              
              {!baseImagePreview ? (
                <button className="btn-upload" onClick={() => fileInputRef.current.click()}>📎 点击上传单张底图</button>
              ) : (
                <div className="preview-container">
                  <img src={baseImagePreview} alt="Base" onClick={() => setEditingImageIdx(true)} className="preview-img" />
                  <button onClick={removeImage} className="btn-remove">✕</button>
                  <span className="preview-hint">点击可作画笔标记</span>
                </div>
              )}
            </div>
          )}

          <button onClick={handleExtractScenes} disabled={isExtracting || (activeTab === 'image' && !baseImagePreview)} className="btn-primary" style={{ marginTop: '1.5rem' }}>
            {isExtracting ? '⏳ 正在让AI深度阅读并提取分镜...' : '🪄 第一步：智能解析文案分镜'}
          </button>
          
          {errorMessage && <div className="alert error">{errorMessage}</div>}
          {infoMessage && <div className="alert info">{infoMessage}</div>}
        </div>

        {scenes.length > 0 && (
          <div className="card scenes-card">
            <h3>解析出的分镜画面 ({scenes.length}幕)</h3>
            <div className="scenes-grid">
              {scenes.map((scene, idx) => (
                <div key={idx} className="scene-item">
                  <div className="scene-num">Scene {idx + 1}</div>
                  <div className="scene-desc">{scene.description}</div>
                  <div className="scene-prompt">{scene.prompt}</div>
                </div>
              ))}
            </div>
            
            <button onClick={handleGenerateAll} disabled={isGenerating} className="btn-generate">
              {isGenerating ? '🌌 正在并行渲染所有分镜...' : `🚀 第二步：一键生成所有 ${scenes.length} 张大图`}
            </button>
          </div>
        )}

        {(results.length > 0 || isGenerating) && (
          <div className="card results-card">
            <h3>生成结果集</h3>
            <div className="results-grid">
              {results.map((res, idx) => (
                <div key={idx} className="result-item">
                  
                  <div className="result-header">镜头 {idx + 1}</div>
                  {res === null ? (
                    <div className="result-loading">
                       <SingularityLoader />
                    </div>
                  ) : res === 'error' ? (
                    <div className="result-error">生成失败</div>
                  ) : (
                    <>
                      <img src={res} alt={`Result ${idx}`} className="result-img" />
                      <div className="result-actions" style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (res && res.startsWith('data:')) {
                              const newTab = window.open();
                              newTab.document.write(`<html><body style="margin: 0; display: flex; justify-content: center; align-items: center; background: #0e1111; min-height: 100vh;"><img src="${res}" style="max-width: 100%; height: auto;" /></body></html>`);
                              newTab.document.close();
                            } else {
                              window.open(res, '_blank');
                            }
                          }}
                          className="btn-result-action secondary" 
                          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        >
                          👁️ 预览
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const link = document.createElement('a');
                            link.href = res;
                            link.download = `result_${idx}_${Date.now()}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="btn-result-action secondary" 
                          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        >
                          💾 下载
                        </button>
                      </div>
                    </>
                  )}

                  {scenes[idx] && <p className="result-desc">{scenes[idx].description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      
        {/* History Gallery Section */}
        {emailStatus === 'verified' && (
          <section className="gallery-section" style={{ marginTop: '3rem' }}>
            <div className="gallery-header">
              <h3>📦 我的多图作品库</h3>
              <p>保存您历史生成的全部高清大片</p>
            </div>

            {isLoadingHistory ? (
              <div className="gallery-loader">⏳ 正在读取您的云端作品库...</div>
            ) : historyList.length === 0 ? (
              <div className="gallery-empty">您还没有生成过任何画作，在上方填写参数生成您的第一套大片吧！</div>
            ) : (
              <div className="gallery-grid">
                {historyList.map((item) => (
                  <div key={item.id} className="gallery-card">
                    <div className="gallery-img-container">
                      <img src={item.display_url || item.generated_url} alt={item.style} className="gallery-img" />
                    </div>
                    <div className="gallery-card-info">
                      <span className="gallery-style-badge">{item.style === 'edit' ? '📸 局部衍生' : '✨ 文本分镜'}</span>
                      <p className="gallery-prompt-text">{item.prompt || '图景'}</p>
                      <div className="gallery-card-actions">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.generated_url && item.generated_url.startsWith('data:')) {
                              const newTab = window.open();
                              newTab.document.write(`<html><body style="margin: 0; display: flex; justify-content: center; align-items: center; background: #0e1111; min-height: 100vh;"><img src="${item.generated_url}" style="max-width: 100%; height: auto;" /></body></html>`);
                              newTab.document.close();
                            } else {
                              window.open(item.generated_url, '_blank');
                            }
                          }}
                          className="gallery-action-link"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          预览
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const link = document.createElement('a');
                            link.href = item.generated_url;
                            link.download = `history_${item.id}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="gallery-action-link"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          下载
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>

      <ImageMarkupModal 
        isOpen={editingImageIdx}
        onClose={() => setEditingImageIdx(false)}
        imageUrl={baseImagePreview}
        onSave={(file, previewUrl) => {
          setBaseImage(file);
          setBaseImagePreview(previewUrl);
          setEditingImageIdx(false);
        }}
      />

      <style jsx>{`
        .app-container { max-width: 1200px; margin: 0 auto; padding: 2rem; color: #f8fafc; font-family: 'Inter', sans-serif; }
        .header { text-align: center; margin-bottom: 2rem; }
        .title { font-size: 2rem; background: linear-gradient(to right, #2dd4bf, #3b82f6); -webkit-background-clip: text; color: transparent; }
        .subtitle { color: #94a3b8; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .mode-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: #0f172a; padding: 0.5rem; border-radius: 12px; border: 1px solid #334155; }
        .mode-tab { flex: 1; background: transparent; border: none; color: #94a3b8; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .mode-tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
        .mode-tab.active { background: #1e293b; color: #2dd4bf; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .input-textarea { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 1rem; border-radius: 8px; resize: vertical; }
        .style-select { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 1rem; border-radius: 8px; cursor: pointer; }
        .upload-section { margin: 1.5rem 0 0 0; border-top: 1px solid #334155; padding-top: 1.5rem; }
        .hint { font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem; }
        .btn-upload { background: #334155; border: 1px dashed #475569; color: #e2e8f0; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-upload:hover { border-color: #2dd4bf; color: #2dd4bf; }
        .preview-container { position: relative; width: 150px; height: 150px; border-radius: 8px; overflow: hidden; border: 2px solid #2dd4bf; }
        .preview-img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
        .preview-img:hover { transform: scale(1.05); }
        .btn-remove { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }
        .preview-hint { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 0.7rem; text-align: center; padding: 4px; pointer-events: none; }
        .btn-primary { width: 100%; background: linear-gradient(135deg, #0f766e, #0d9488); color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; }
        .btn-primary:hover { background: linear-gradient(135deg, #0d9488, #14b8a6); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-generate { width: 100%; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; margin-top: 1.5rem; }
        .btn-generate:hover { background: linear-gradient(135deg, #4338ca, #2563eb); }
        .alert { padding: 1rem; border-radius: 8px; margin-top: 1rem; }
        .alert.error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #fca5a5; }
        .alert.info { background: rgba(45, 212, 191, 0.1); border: 1px solid #2dd4bf; color: #5eead4; }
        .scenes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .scene-item { background: #0f172a; border: 1px solid #334155; padding: 1rem; border-radius: 8px; }
        .scene-num { font-weight: bold; color: #2dd4bf; margin-bottom: 0.5rem; }
        .scene-desc { font-size: 0.9rem; margin-bottom: 0.5rem; color: #e2e8f0; }
        .scene-prompt { font-size: 0.75rem; color: #94a3b8; font-family: monospace; word-break: break-all; }
        .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
        .result-item { background: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid #334155; display: flex; flex-direction: column; }
        .result-header { padding: 0.5rem 1rem; background: #1e293b; font-weight: bold; font-size: 0.9rem; color: #cbd5e1; border-bottom: 1px solid #334155; }
        .result-loading { height: 250px; display: flex; align-items: center; justify-content: center; }
        .result-error { height: 250px; display: flex; align-items: center; justify-content: center; color: #ef4444; }
        .result-img { width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; }
        .result-desc { padding: 1rem; font-size: 0.85rem; color: #94a3b8; margin: 0; background: #1e293b; }

        .site-header { background-color: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 100; margin-bottom: 2rem;}
        .header-container { max-width: 1400px; margin: 0 auto; padding: 0.85rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .logo-title { font-size: 1.5rem; font-weight: 700; margin: 0; background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .user-section { display: flex; align-items: center; }
        .login-form { display: flex; gap: 0.5rem; }
        .login-input { background-color: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 0.5rem 0.85rem; color: #fff; }
        .btn-login { background-color: #0d9488; color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; }
        .user-badge { display: flex; align-items: center; gap: 0.75rem; background: rgba(13, 148, 136, 0.08); border: 1px solid rgba(13, 148, 136, 0.3); border-radius: 8px; padding: 0.4rem 0.85rem; font-size: 0.85rem; }
        .user-email { font-weight: 500; color: #2dd4bf; }
        .user-credits { color: #f8fafc; border-left: 1px solid rgba(255, 255, 255, 0.15); padding-left: 0.75rem; }
        .btn-recharge { background-color: #f59e0b; color: #0b1120; border: none; border-radius: 6px; padding: 0.25rem 0.65rem; font-weight: 700; cursor: pointer; }
        .btn-logout { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
        .gallery-section { margin-top: 3rem; }
        .gallery-header { margin-bottom: 2rem; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .gallery-card { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; transition: transform 0.2s; }
        .gallery-card:hover { transform: translateY(-4px); }
        .gallery-img-container { width: 100%; aspect-ratio: 1; overflow: hidden; background: #0f172a; }
        .gallery-img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-card-info { padding: 1rem; }
        .gallery-style-badge { background: rgba(45,212,191,0.1); color: #2dd4bf; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; }
        .gallery-prompt-text { font-size: 0.85rem; color: #cbd5e1; margin: 0.75rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .gallery-card-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .gallery-action-link, .gallery-action-btn { flex: 1; text-align: center; background: rgba(255,255,255,0.05); color: #94a3b8; border: none; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; text-decoration: none; }
        .gallery-action-link:hover, .gallery-action-btn:hover { background: rgba(255,255,255,0.1); color: white; }
      `}</style>
    </div>
  );
}
