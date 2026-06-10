import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import HistoryGallery from '../components/HistoryGallery';

const SingularityLoader = dynamic(() => import('../components/SingularityLoader'), {
  ssr: false
});

const ImageMarkupModal = dynamic(() => import('../components/ImageMarkupModal'), {
  ssr: false
});

export default function MultiImage() {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image'
  const [unifiedStyle, setUnifiedStyle] = useState('Cinematic 电影感摄影');
  const [unifiedSize, setUnifiedSize] = useState('1024x1024');
  const [sceneCount, setSceneCount] = useState(6);

  const [copyText, setCopyText] = useState('');
  const [baseImage, setBaseImage] = useState(null);
  const [baseImagePreview, setBaseImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [scenes, setScenes] = useState([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [documentData, setDocumentData] = useState(null);

  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  
  const [editingImageIdx, setEditingImageIdx] = useState(false);
  const [editingPromptIdx, setEditingPromptIdx] = useState(null);
  const [editingPromptText, setEditingPromptText] = useState('');

  const openPromptEditModal = (idx) => {
    setEditingPromptIdx(idx);
    setEditingPromptText(scenes[idx]?.prompt || '');
  };

  const handleSavePromptAndRegenerate = () => {
    if (editingPromptIdx === null) return;
    const newScenes = [...scenes];
    newScenes[editingPromptIdx].prompt = editingPromptText;
    setScenes(newScenes);
    handleRetryGenerate(editingPromptIdx);
    setEditingPromptIdx(null);
  };

  const EMAIL_REGEX = /^[^s@]+@[^s@]+\.[^s@]+$/;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
    localStorage.removeItem('timage_password');
    localStorage.removeItem('timage_verified');
    setEmail('');
    setPassword('');
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
        const validImages = (res.data.images || []).map(img => {
          if (img.display_url && img.display_url.startsWith('error:')) {
            return { ...img, display_url: 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Saved+Locally' };
          }
          return img;
        });
        setHistoryList(validImages);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Parse long text into scenes
  const isExtractingRef = useRef(false);

  const handleExtractScenes = async () => {
    if (!copyText.trim() && !documentData) {
      setErrorMessage('请输入长文案或导入文档内容！');
      return;
    }
    if (isExtractingRef.current) return;
    
    if (emailStatus !== 'verified') {
      setErrorMessage('请先输入邮箱登录，享受每日免费智能生图额度！');
      return;
    }
    if (credits < 1) {
      setErrorMessage('额度不足！智能提取分镜需要 1 额度。请点击右上角“充值请联系”扫码充值！');
      return;
    }

    isExtractingRef.current = true;
    setIsExtracting(true);
    setErrorMessage('');
    
    try {
      // We will create a new endpoint /api/timage/extract-scenes
      const payload = { 
        text: copyText,
        unifiedStyle: activeTab === 'text' ? unifiedStyle : null,
        sceneCount,
        email
      };
      
      if (documentData) {
        payload.documentBase64 = documentData.base64;
        payload.documentMimeType = documentData.mimeType;
      }
      
      if (activeTab === 'image' && baseImagePreview) {
        payload.image = baseImagePreview;
      }

      const response = await axios.post('/api/timage/extract-scenes', payload);
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
      isExtractingRef.current = false;
    }
  };

  const isGeneratingRef = useRef(false);

  const handleGenerateAll = async () => {
    if (scenes.length === 0) return;
    if (isGeneratingRef.current) return;
    
    let creditsPerImage = 5;
    if (unifiedSize) {
      const [w, h] = unifiedSize.split('x').map(Number);
      if (w && h) {
        const pixels = w * h;
        if (pixels >= 16000000) creditsPerImage = 25;
        else if (pixels >= 3000000) creditsPerImage = 25;
      }
    }

    const totalCreditsNeeded = scenes.length * creditsPerImage;
    if (credits < totalCreditsNeeded) {
      setErrorMessage(`额度不足！批量生成 ${scenes.length} 个分镜需要 ${totalCreditsNeeded} 额度（大规格图更费积分），当前仅剩 ${credits} 额度。请点击右上角“充值请联系”扫码充值！`);
      return;
    }

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setErrorMessage('');
    setInfoMessage('');
    
    // Initialize results with placeholders
    setResults(new Array(scenes.length).fill(null));
    
    // Add a short delay to allow React to render the UI and fetch dynamic chunks 
    // before the browser's HTTP connection pool gets clogged by 6 heavy concurrent API requests.
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
          formData.append('prompt_en', scene.prompt);
          if (scene.description) formData.append('description', scene.description);
          if (email) formData.append('email', email);
          formData.append('size', unifiedSize);
          formData.append('image', baseImage);
          
          const res = await axios.post('/api/timage/edit', formData);
          if (res.data?.success) {
            updateResult(idx, res.data.originalUrl || res.data.freeimageUrl);
          } else {
            updateResult(idx, 'error');
          }
        } else {
          const res = await axios.post('/api/timage/generate', {
            prompt: scene.prompt,
            prompt_en: scene.prompt,
            description: scene.description,
            size: unifiedSize,
            email
          });
          if (res.data?.success) {
            updateResult(idx, res.data.originalUrl || res.data.freeimageUrl);
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
    isGeneratingRef.current = false;
    setInfoMessage('✅ 批量生成完毕！');
    if (email) {
      try {
        const lastRes = await axios.post('/api/timage/pre-check', { email, password });
        if (lastRes.data?.success) {
          setCredits(lastRes.data.credits);
        }
      } catch (err) {
        console.error('Failed to update credits:', err);
      }
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

  const handleRetryGenerate = async (idx) => {
    const scene = scenes[idx];
    if (!scene) return;

    // Set this specific result back to null (loading state)
    updateResult(idx, null);

    try {
      if (activeTab === 'image') {
        if (!baseImage) {
          updateResult(idx, 'error');
          return;
        }
        const formData = new FormData();
        formData.append('prompt', scene.prompt);
        if (email) formData.append('email', email);
        formData.append('size', '1024x1024'); // default
        formData.append('image', baseImage);
        
        const res = await axios.post('/api/timage/edit', formData);
        if (res.data?.success) {
          updateResult(idx, res.data.originalUrl || res.data.freeimageUrl);
        } else {
          updateResult(idx, 'error');
        }
      } else {
        const res = await axios.post('/api/timage/generate', {
          prompt: scene.prompt,
          size: '1024x1024',
          email
        });
        if (res.data?.success) {
          updateResult(idx, res.data.originalUrl || res.data.freeimageUrl);
        } else {
          updateResult(idx, 'error');
        }
      }
    } catch (err) {
      updateResult(idx, 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1536;
          
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const quality = file.size > 10 * 1024 * 1024 ? 0.7 : 0.85;
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            const previewUrl = canvas.toDataURL('image/jpeg', quality);
            setBaseImage(compressedFile);
            setBaseImagePreview(previewUrl);
          }, 'image/jpeg', quality);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      if (file.size > 4.5 * 1024 * 1024) {
        setErrorMessage('非图片文件大小不能超过 4.5MB！');
        return;
      }
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
        <meta name="description" content="智能分镜批量多图生成引擎" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/tg-192.png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      
      <Header 
        title="天工创界 | 多幕叙事" 
        subtitle="AI 连续故事画板生成"
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>1. 输入长文案 / 故事文档</h3>
            <div className="doc-upload-wrapper">
              <input 
                type="file" 
                id="doc-upload" 
                accept=".pdf,.docx,.txt" 
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  if (file.size > 10 * 1024 * 1024) {
                    setErrorMessage('文档不能超过10MB！');
                    return;
                  }
                  
                  setInfoMessage('正在读取文档...');
                  setErrorMessage('');
                  
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64Data = event.target.result.split(',')[1];
                    // Store it directly into the state
                    setDocumentData({
                      name: file.name,
                      base64: base64Data,
                      mimeType: file.type || 'application/pdf'
                    });
                    setInfoMessage(`文档 ${file.name} 已加载！您可以继续填写需求，或直接点击提取分镜。AI 会直接阅读文档。`);
                    e.target.value = ''; // Reset input
                  };
                  reader.onerror = () => {
                    setErrorMessage('读取文档失败！');
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button 
                onClick={() => document.getElementById('doc-upload').click()}
                disabled={isExtracting}
                style={{
                  background: documentData ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  border: documentData ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
                  color: documentData ? '#34d399' : '#e2e8f0',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!documentData) e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  if (!documentData) e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                📄 {documentData ? `已加载: ${documentData.name.length > 10 ? documentData.name.substring(0, 10) + '...' : documentData.name}` : '上传 PDF/DOCX 直接分析'}
              </button>
              {documentData && (
                <button 
                  onClick={() => { setDocumentData(null); setInfoMessage('文档已移除。'); }}
                  style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', marginLeft: '5px' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <p className="hint">AI会自动阅读长文并提取分镜画面</p>
            <textarea 
            value={copyText} 
            onChange={e => setCopyText(e.target.value)}
            placeholder="粘贴您的公众号推文、小说故事或多图需求描述... 您也可以点击右上方按钮导入 PDF/DOCX/TXT 文档。"
            rows={6}
            className="input-textarea"
          />
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
            <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginRight: '1rem' }}>生成分镜数量 (2-20张)：</label>
            <input 
              type="number" 
              min="2" max="20" 
              value={sceneCount} 
              onChange={e => setSceneCount(e.target.value ? Math.min(20, Math.max(2, parseInt(e.target.value) || 2)) : '')}
              onBlur={() => {
                if (!sceneCount || sceneCount < 2) setSceneCount(2);
              }}
              style={{
                background: '#0f172a', border: '1px solid #334155', color: '#fff',
                padding: '0.5rem', borderRadius: '6px', width: '80px'
              }}
            />
          </div>
          
          {activeTab === 'text' && (
            <div className="upload-section">
              <h3>2. 全局参数设置</h3>
              <p className="hint">我们将强制要求AI在生成的所有分镜中保持一致的风格与尺寸，确保输出具备连贯性。</p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>🎨 选择统一风格：</label>
                <select value={unifiedStyle} onChange={(e) => setUnifiedStyle(e.target.value)} className="style-select">
                  <option value="Cinematic 电影感摄影">Cinematic 电影感真实摄影</option>
                  <option value="Studio Ghibli 宫崎骏动画风格">Studio Ghibli 宫崎骏日系动画风格</option>
                  <option value="3D Pixar 皮克斯3D渲染">3D Pixar 皮克斯3D卡通渲染</option>
                  <option value="Watercolor 浪漫水彩插画">Watercolor 唯美水彩插画</option>
                  <option value="Cyberpunk 赛博朋克风">Cyberpunk 霓虹赛博朋克风</option>
                  <option value="Minimalist Flat Design 极简扁平化插画">Minimalist Flat 极简扁平化</option>
                  <option value="Comic Book 漫画风格">Comic Book 漫画风格</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>📐 输出比例/尺寸：</label>
                <select value={unifiedSize} onChange={(e) => setUnifiedSize(e.target.value)} className="style-select">
                  <option value="1024x1792">9:16 长图攻略 / 竖版海报 (1024x1792)</option>
                  <option value="800x2400">1:3 超长图 / 小红书瀑布流 (800x2400)</option>
                  <option value="1024x1365">3:4 小红书种草 / 旅拍写真 (1024x1365)</option>
                  <option value="1792x1024">16:9 风光大片 / 目的地宽屏 (1792x1024)</option>
                  <option value="1024x1024">1:1 正方形图文配图 (1024x1024)</option>
                  <option value="1024x768">4:3 书籍配图 / 行程细节图 (1024x768)</option>
                </select>
              </div>
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

              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>📐 输出比例/尺寸：</label>
                <select value={unifiedSize} onChange={(e) => setUnifiedSize(e.target.value)} className="style-select">
                  <option value="1024x1792">9:16 长图攻略 / 竖版海报 (1024x1792)</option>
                  <option value="800x2400">1:3 超长图 / 小红书瀑布流 (800x2400)</option>
                  <option value="1024x1365">3:4 小红书种草 / 旅拍写真 (1024x1365)</option>
                  <option value="1792x1024">16:9 风光大片 / 目的地宽屏 (1792x1024)</option>
                  <option value="1024x1024">1:1 正方形图文配图 (1024x1024)</option>
                  <option value="1024x768">4:3 书籍配图 / 行程细节图 (1024x768)</option>
                </select>
              </div>
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
              {(() => {
                if (isGenerating) return '🌌 正在并行渲染所有分镜...';
                let creditsPerImage = 5;
                if (unifiedSize) {
                  const [w, h] = unifiedSize.split('x').map(Number);
                  if (w && h) {
                    const pixels = w * h;
                    if (pixels >= 16000000) creditsPerImage = 20;
                    else if (pixels >= 3000000) creditsPerImage = 10;
                  }
                }
                return `🚀 第二步：一键生成所有 ${scenes.length} 张大图 (消耗 ${scenes.length * creditsPerImage} 额度)`;
              })()}
            </button>
          </div>
        )}

        {(results.length > 0 || isGenerating) && (
          <div className="card results-card">
            <h3>生成结果集</h3>
            <div className="results-grid">
              {results.map((res, idx) => (
                <div key={idx} className="result-item">
                  
                  <div className="result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>镜头 {idx + 1}</span>
                    <button 
                      onClick={() => openPromptEditModal(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                      title="编辑提示词并重新生成"
                    >
                      ✏️
                    </button>
                  </div>
                  {res === null ? (
                    <div className="result-loading" style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                       <div style={{ transform: 'scale(0.35)', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <SingularityLoader />
                       </div>
                    </div>
                  ) : res === 'error' ? (
                    <div className="result-error" style={{ height: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ color: '#ef4444' }}>生成失败</span>
                      <button 
                        onClick={() => handleRetryGenerate(idx)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                      >
                        🔄 重新生成
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }} className="result-img-wrapper">
                        <a href={res} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative' }}>
                          <img src={res} alt={`Result ${idx}`} className="result-img" style={{ width: '100%', height: '100%', transition: 'transform 0.3s ease' }} />
                          <div className="preview-overlay" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                          }}>
                            🔗 点击预览
                          </div>
                        </a>
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
        <HistoryGallery 
          email={email}
          emailStatus={emailStatus}
          initialHistoryList={historyList}
        />

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

      {editingPromptIdx !== null && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>修改镜头 {editingPromptIdx + 1} 的提示词</h3>
            <textarea
              value={editingPromptText}
              onChange={(e) => setEditingPromptText(e.target.value)}
              rows={8}
              className="input-textarea"
              style={{ marginTop: '1rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={() => setEditingPromptIdx(null)} style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem' }} onClick={handleSavePromptAndRegenerate}>保存并重新生成</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .result-img-wrapper:hover .preview-overlay { opacity: 1 !important; }
        .result-img-wrapper:hover .result-img { transform: scale(1.05) !important; }
        .gallery-img-container:hover .preview-overlay { opacity: 1 !important; }
        .gallery-img-container:hover .gallery-img { transform: scale(1.05); }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 2rem; width: 100%; box-sizing: border-box; }
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
