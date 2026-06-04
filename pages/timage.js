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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TImage() {
  // Removed activeTab since UI is unified
  // Pre-configured travel types
  const travelCategories = [
    {
      id: 'marketing',
      title: '一、营销获客类图片',
      description: '助力各大旅行社与OTA进行社群获客与社交媒体裂变',
      types: [
        {
          id: 'itinerary',
          name: '1. 旅游攻略图/行程长图',
          recommendSize: '1024x1792',
          aspectRatio: '9:16',
          desc: '生成唯美目的地组合图与行程日程版式，适合小红书/朋友圈分享。',
          defaultPrompt: '一份精美且高度细节的[destination]旅游攻略信息图，展示以下核心景点：[highlights]。浪漫水彩手绘风旅游指南排版，柔和的标签设计，优雅的构图，高分辨率，唯美氛围。',
          placeholderHighlights: '历史古刹，当地小吃街，绝美游船夜景'
        },
        {
          id: 'poster',
          name: '2. 爆款旅游海报',
          recommendSize: '1024x1365',
          aspectRatio: '3:4',
          desc: '生成极具视觉冲击力的海报背景图，顶部留白，适合添加定制文案。',
          defaultPrompt: '一张极其精致的高端旅游海报，宣传[destination]。[vibe]风格，专业旅游摄影级别，顶部留白以便添加定制旅游文案，令人惊叹的黄金时刻光影，电影感氛围，8k超高分辨率。'
        },
        {
          id: 'social',
          name: '3. 社交媒体种草图文',
          recommendSize: '1024x1024',
          aspectRatio: '1:1',
          desc: '色彩明亮饱和、细节丰满的图文种草配图，符合主流分享平台的审美。',
          defaultPrompt: '生动充满活力的社交媒体生活方式照片，展现[destination]的魅力。明亮温暖的夏日色彩，充满美感的构图，捕捉当地文化精髓，流行旅游博主审美，极具吸引力的视觉效果，清晰明亮。'
        }
      ]
    },
    {
      id: 'product',
      title: '二、产品设计类图片',
      description: '为目的地规划、酒店民宿方案提供超前概念视觉呈现',
      types: [
        {
          id: 'concept',
          name: '1. 目的地视觉概念图',
          recommendSize: '1792x1024',
          aspectRatio: '16:9',
          desc: '描绘仙境般、未来感或概念化的目的地风光，展示核心设计愿景。',
          defaultPrompt: '令人窒息的高保真[destination]视觉概念艺术设计图，被重新构建为童话般的仙境，空灵的灯光，薄雾缭绕的云海，史诗般的景观设计，绝美神作，屡获殊荣的数字概念艺术。'
        },
        {
          id: 'season',
          name: '2. 季节/时间转换图',
          recommendSize: '1024x768',
          aspectRatio: '4:3',
          desc: '模拟相同场景在不同季节（春夏秋冬）或时间（晨昏夜色）的光影演变。',
          defaultPrompt: '一张完美的[destination]对比风景图，展现出[time_season]风景的无缝过渡。令人难以置信的丰富细节，充满对比的氛围光影，统一的构图，顶级大师之作。'
        },
        {
          id: 'hotel',
          name: '3. 酒店/民宿氛围图',
          recommendSize: '1792x1024',
          aspectRatio: '16:9',
          desc: '展现高端奢华的客房光影或庭院细节，窗外融合目的地绝美风景。',
          defaultPrompt: '奢华精品酒店的室内设计，透过落地窗可以看到外面[destination]的绝美风景。[vibe]的室内设计风格，柔和的氛围灯光，舒适奢华的美学，顶级建筑设计杂志风格，照片级真实感。'
        }
      ]
    },
    {
      id: 'service',
      title: '三、客户服务类图片',
      description: '为旅客提供定制化的一站式高附加值服务物料',
      types: [
        {
          id: 'portrait',
          name: '1. 游客AI旅拍/出片',
          recommendSize: '1024x1365',
          aspectRatio: '3:4',
          desc: '一键将游客上传的底图人物，无缝融合融入到目的地的风景名胜风光中。',
          defaultPrompt: '一张极其华丽的旅游肖像照，游客完美无瑕地融入到黄金时刻[destination]令人惊叹的风景中，浅景深虚化背景，专业旅行人像摄影，和谐完美的光影匹配，高级唯美感。'
        },
        {
          id: 'route',
          name: '2. 行程方案配图',
          recommendSize: '1024x768',
          aspectRatio: '4:3',
          desc: '为定制路书、电子行程单设计的地标性手绘、扁平或写实插画。',
          defaultPrompt: '专为高端旅游路书设计的[destination]优雅风景插画。扁平化艺术风格，精美的矢量设计，干净流畅的线条，宁静柔和的色彩，专业旅游插画，充满文艺气息。'
        }
      ]
    }
  ];

  // States
  const [selectedType, setSelectedType] = useState(travelCategories[0].types[0]);
  const [destination, setDestination] = useState('九寨沟');
  const [highlights, setHighlights] = useState('碧绿海子、五彩池、珍珠滩瀑布');
  const [vibe, setVibe] = useState('电影胶片氛围');
  const [season, setSeason] = useState('日落黄金时刻');

  // Basic states
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1792');
  const [quality, setQuality] = useState('standard');
  const [format, setFormat] = useState('jpeg');

  // Image Uploads (Image-to-Image / AI旅拍)
  const [image1, setImage1] = useState(null);
  const [image1Preview, setImage1Preview] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);

  // Image Editor States
  const [editingImageIdx, setEditingImageIdx] = useState(null); // null, 1, or 2

  // Status & loading states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [displayUrl, setDisplayUrl] = useState(null);

  // Prompt Optimization States
  const [simpleIdea, setSimpleIdea] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedResults, setOptimizedResults] = useState([]);
  const [selectedOptimizedIndexes, setSelectedOptimizedIndexes] = useState([]);
  const [currentSessionOutputs, setCurrentSessionOutputs] = useState([]);

  // Email verification state (Simplifed directly calling backend pre-check)
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('none'); // none | verified
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // History gallery states
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  // Update prompt whenever parameters change
  useEffect(() => {
    if (!selectedType) return;

    let generatedPrompt = selectedType.defaultPrompt
      .replace('[destination]', destination)
      .replace('[highlights]', highlights)
      .replace('[vibe]', vibe)
      .replace('[time_season]', season);

    setPrompt(generatedPrompt);
    setSize(selectedType.recommendSize);
  }, [selectedType, destination, highlights, vibe, season]);

  // Load Email and Credits on Start
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

  const handleFileChange = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('单张图片大小不能超过 10MB！');
      return;
    }

    if (file.type.startsWith('image/')) {
      // Auto-compress large images to bypass Vercel 4.5MB serverless payload limit
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
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            const previewUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            if (index === 1) {
              setImage1(compressedFile);
              setImage1Preview(previewUrl);
            } else {
              setImage2(compressedFile);
              setImage2Preview(previewUrl);
            }
          }, 'image/jpeg', 0.85);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // Documents (PDF/DOCX/TXT)
      if (file.size > 4.5 * 1024 * 1024) {
        setErrorMessage('由于云服务限制，非图片类文档大小请控制在 4MB 以内！');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (index === 1) {
          setImage1(file);
          setImage1Preview(reader.result);
        } else {
          setImage2(file);
          setImage2Preview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index) => {
    if (index === 1) {
      setImage1(null);
      setImage1Preview(null);
      if (fileInputRef1.current) fileInputRef1.current.value = '';
    } else {
      setImage2(null);
      setImage2Preview(null);
      if (fileInputRef2.current) fileInputRef2.current.value = '';
    }
  };

  const handleOptimizePrompt = async () => {
    if (!simpleIdea.trim()) return;

    setIsOptimizing(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const categoryName = selectedType ? selectedType.name : '旅游攻略图';
      const response = await axios.post('/api/timage/optimize-prompt', {
        userPrompt: simpleIdea,
        categoryName
      });

      if (response.data && response.data.success) {
        const results = response.data.optimizedPrompts || [];
        setOptimizedResults(results);
        if (results.length > 0) {
          setSelectedOptimizedIndexes([0]); // Default to selecting the first prompt card
          setPrompt(results[0].promptZh || results[0].prompt);    // Sync first prompt to main text area
        } else {
          setSelectedOptimizedIndexes([]);
        }
        setInfoMessage('🪄 智能引擎成功为您改写并润色了 3 款不同风格的绝美指令！您可以勾选多条，一次性生成多张大图！');
      } else {
        setErrorMessage(response.data.error || '提示词优化失败');
      }
    } catch (err) {
      console.error('Failed to optimize prompt:', err);
      setErrorMessage(err.response?.data?.error || err.message || '网络请求错误，请稍后再试');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Generate Image Action
  const handleGenerate = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setGeneratedUrl(null);
    setDisplayUrl(null);

    if (emailStatus !== 'verified') {
      setErrorMessage('请先输入邮箱登录，享受每日免费智能生图额度！');
      return;
    }

    // Determine if batch mode is active
    const isBatchMode = selectedOptimizedIndexes.length > 1;

    if (isBatchMode) {
      const totalCreditsNeeded = selectedOptimizedIndexes.length * 5;
      if (credits < totalCreditsNeeded) {
        setErrorMessage(`额度不足！批量生成 ${selectedOptimizedIndexes.length} 张图需要 ${totalCreditsNeeded} 额度，当前仅剩 ${credits} 额度。请点击右上角“充值请联系”扫码充值！`);
        return;
      }
    } else {
      if (credits < 5) {
        setErrorMessage('额度不足！请点击右上角“充值请联系”按钮扫码获取充值额度。');
        return;
      }
      if (!prompt) {
        setErrorMessage('请输入画面描述提示词！');
        return;
      }
    }

    setIsProcessing(true);

    try {
      if (isBatchMode) {
        // BATCH GENERATION FLOW
        const batchPrompts = selectedOptimizedIndexes.map(idx => optimizedResults[idx].promptZh || optimizedResults[idx].prompt);
        console.log(`[TImage Batch] Starting parallel batch generation for ${batchPrompts.length} prompts`);

        // Pre-initialize outputs with empty slots to trigger immediate placeholder rendering
        setCurrentSessionOutputs(new Array(batchPrompts.length).fill(null));

        const results = [];
        for (let arrayIndex = 0; arrayIndex < selectedOptimizedIndexes.length; arrayIndex++) {
          const idx = selectedOptimizedIndexes[arrayIndex];
          const opt = optimizedResults[idx];
          const p = opt.promptZh || opt.prompt;
          
          try {
            let res;
            if (!image1) {
              res = await axios.post('/api/timage/generate', {
                prompt: p,
                prompt_en: opt.prompt,
                prompt_zh: opt.promptZh,
                size,
                quality,
                format,
                email
              });
            } else {
              const formData = new FormData();
              formData.append('prompt', p);
              formData.append('prompt_en', opt.prompt);
              formData.append('prompt_zh', opt.promptZh);
              formData.append('size', size);
              formData.append('email', email);
              formData.append('image', image1);
              if (image2) formData.append('image', image2);
              res = await axios.post('/api/timage/edit', formData);
            }
            
            if (res.data?.success) {
              const item = {
                displayUrl: res.data.freeimageUrl,
                generatedUrl: res.data.originalUrl || res.data.freeimageUrl
              };
              // Deliver this image immediately into its pre-allocated slot!
              setCurrentSessionOutputs(prev => {
                const updated = [...prev];
                updated[arrayIndex] = item;
                return updated;
              });
              
              if (email) loadHistory(email);
              results.push(item);
            } else {
              console.error(`Prompt slot ${idx} failed:`, res.data?.error);
              setCurrentSessionOutputs(prev => {
                const updated = [...prev];
                updated[arrayIndex] = 'error';
                return updated;
              });
              results.push(null);
            }
          } catch (err) {
            console.error(`Prompt slot ${idx} error:`, err);
            setCurrentSessionOutputs(prev => {
              const updated = [...prev];
              updated[arrayIndex] = 'error';
              return updated;
            });
            results.push(null);
          }
          
          // Add a 2-second delay between requests to be extra safe against rate limits
          if (arrayIndex < selectedOptimizedIndexes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        const validResults = results.filter(Boolean);

        if (validResults.length > 0) {
          // Find the first completed output to set as primary highlights
          const firstValid = validResults[0];
          setDisplayUrl(firstValid.displayUrl);
          setGeneratedUrl(firstValid.generatedUrl);

          // Re-fetch remaining credits
          const lastRes = await axios.post('/api/timage/pre-check', { email });
          if (lastRes.data?.success) {
            setCredits(lastRes.data.credits);
          }

          setInfoMessage(`🎉 成功批量生成并交付了 ${validResults.length} 张高清旅游大图！`);
          loadHistory(email);
        }
      } else {
        // SINGLE GENERATION FLOW
        if (!image1) {
          setCurrentSessionOutputs([null]); // Trigger loading animation
          const response = await axios.post('/api/timage/generate', {
            prompt,
            prompt_en: prompt,
            size,
            quality,
            format,
            email
          });

          if (response.data?.success) {
            const out = {
              displayUrl: response.data.freeimageUrl,
              generatedUrl: response.data.originalUrl || response.data.freeimageUrl
            };
            setCurrentSessionOutputs([out]);
            setGeneratedUrl(out.generatedUrl);
            setDisplayUrl(out.displayUrl);
            setCredits(response.data.credits);

            if (email) loadHistory(email);
          }
        } else {
          // Image-to-Image / AI旅拍 (Single image output)
          const formData = new FormData();
          formData.append('prompt', prompt);
          formData.append('size', size);
          formData.append('email', email);
          formData.append('image', image1);
          if (image2) formData.append('image', image2);

          setCurrentSessionOutputs([null]); // Trigger loading animation
          const response = await axios.post('/api/timage/edit', formData);

          if (response.data?.success) {
            const out = {
              displayUrl: response.data.freeimageUrl,
              generatedUrl: response.data.originalUrl || response.data.freeimageUrl
            };
            setCurrentSessionOutputs([out]);
            setGeneratedUrl(out.generatedUrl);
            setDisplayUrl(out.displayUrl);
            setCredits(response.data.credits);
            
            if (email) loadHistory(email);
          }
        }
      }
    } catch (error) {
      console.error(error);
      const errDetail = error.response?.data?.error || error.message || 'AI 绘画引擎响应失败';
      setErrorMessage(errDetail);
      setCurrentSessionOutputs(prev => prev.map(item => item === null ? 'error' : item));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <Head>
        <title>天工创界 | 旅游行业 AI 智能生图 Agent</title>
        <meta name="description" content="专为旅游行业客户定制的AI智能营销长图、爆款海报、目的地视觉、酒店民宿氛围与AI旅拍出片系统" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/tg-192.png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <Header 
        title="天工创界" 
        subtitle="旅游规划与获客 AI 智绘 Agent"
        email={email}
        setEmail={setEmail}
        emailStatus={emailStatus}
        credits={credits}
        isCheckingEmail={isCheckingEmail}
        onVerifyEmail={handleVerifyEmail}
        onLogout={handleLogout}
      />

      {/* Hero */}
      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="hero-badge">TRAVEL INDUSTRY EXCLUSIVE</span>
          <h2 className="hero-title">为旅游行业提供超高清、极具感官诱惑的视觉赋能</h2>
          <p className="hero-desc">智能输出爆款旅游攻略长图、高转化营销海报、季节时区概念景物、高端酒店设计氛围与游客AI高清旅拍大片，助力成单率飙升！</p>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="main-workspace">
        <div className="workspace-grid">

          {/* Left Sidebar: Travel Templates Categories */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3>🎯 旅游核心产出物料分类</h3>
              <p>选择类型一键加载专属微调提示词模版与推荐尺寸</p>
            </div>

            {travelCategories.map((category) => (
              <div key={category.id} className="category-group">
                <h4 className="category-title">{category.title}</h4>
                <span className="category-subtitle">{category.description}</span>

                <div className="types-list">
                  {category.types.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type)}
                      className={`type-item-btn ${selectedType.id === type.id ? 'active' : ''}`}
                    >
                      <div className="type-btn-info">
                        <span className="type-btn-name">{type.name}</span>
                        <span className="type-btn-ratio">比例 {type.aspectRatio} | 尺寸 {type.recommendSize}</span>
                      </div>
                      <span className="type-btn-arrow">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right Area: Prompt Tuning & Live Generation */}
          <div className="generation-section">

            {/* Top Config Card */}
            <div className="config-card">
              <div className="config-header">
                <h3>🛠️ 目的地场景深度微调参数 ({selectedType.name})</h3>
                <span className="config-desc">通过调整以下因子，AI 会自动为您拼装出最优的商业级渲染 Prompts</span>
              </div>

              <div className="parameters-grid">
                <div className="param-item">
                  <label>📍 目的地与核心地标 (Destination)</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="例如：京都清水寺、冰岛黑沙滩..."
                    className="param-input"
                  />
                </div>

                {selectedType.id === 'itinerary' && (
                  <div className="param-item">
                    <label>📝 行程亮点 (Highlights - 仅长图攻略有效)</label>
                    <input
                      type="text"
                      value={highlights}
                      onChange={(e) => setHighlights(e.target.value)}
                      placeholder="例如：地道美食街、日落巡航..."
                      className="param-input"
                    />
                  </div>
                )}

                <div className="param-item">
                  <label>🔮 艺术风格与视效 (Art Style / Vibe)</label>
                  <select
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    className="param-select"
                  >
                    <option value="电影胶片氛围">电影胶片氛围 (Cinematic Film)</option>
                    <option value="风光纪录片真实质感">风光纪录片真实质感 (Geographic Realism)</option>
                    <option value="日系治愈动漫风">日系治愈动漫 (Anime Style)</option>
                    <option value="唯美手绘水彩插画">唯美手绘水彩 (Watercolor Illustration)</option>
                    <option value="赛博朋克霓虹风">赛博朋克霓虹 (Cyberpunk Futuristic)</option>
                  </select>
                </div>

                <div className="param-item">
                  <label>⏰ 季节与光效 (Season & Lighting)</label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="param-select"
                  >
                    <option value="日落黄金时刻">日落黄金时刻 (Golden Hour)</option>
                    <option value="迷雾暖春清晨">迷雾暖春清晨 (Misty Morning)</option>
                    <option value="浪漫银冬雪夜">浪漫银冬雪夜 (Snowy Winter Night)</option>
                    <option value="盛夏璀璨星空">盛夏璀璨星空 (Midsummer Starry Sky)</option>
                    <option value="金秋枫红晚霞">金秋枫红晚霞 (Autumn Maple sunset)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mode & Prompt Card */}
            <div className="workspace-card">
              {/* Error / Alert Display */}
              {errorMessage && <div className="alert alert-error">⚠️ {errorMessage}</div>}
              {infoMessage && <div className="alert alert-info">💡 {infoMessage}</div>}

              {/* Gemini Prompt Optimizer Box */}
              <div className="prompt-optimizer-card">
                <label className="optimizer-label">🪄 智能提示词优化 (用简单想法生成多个英文大片指令)</label>
                <div className="optimizer-input-group">
                  <input
                    type="text"
                    value={simpleIdea}
                    onChange={(e) => setSimpleIdea(e.target.value)}
                    placeholder="输入您的简单构想，如：'绝美海滩日落、浪漫旅拍情侣'..."
                    className="optimizer-input-field"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleOptimizePrompt();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !simpleIdea.trim()}
                    className="btn-optimizer-action"
                  >
                    {isOptimizing ? '✨ 智能改写中...' : '🪄 智能优化'}
                  </button>
                </div>

                {optimizedResults.length > 0 && (
                  <div className="optimized-results-area">
                    <span className="results-tip">💡 点击勾选下方卡片进行多选（勾选 2-3 个即可开启一键并行批量生图）：</span>
                    <div className="optimized-suggestions-grid" style={{ marginTop: '0.5rem' }}>
                      {optimizedResults.map((item, idx) => {
                        const isSelected = selectedOptimizedIndexes.includes(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              let nextIndexes = [];
                              if (selectedOptimizedIndexes.includes(idx)) {
                                nextIndexes = selectedOptimizedIndexes.filter(i => i !== idx);
                              } else {
                                nextIndexes = [...selectedOptimizedIndexes, idx];
                              }
                              setSelectedOptimizedIndexes(nextIndexes);
                              // Sync to primary prompt textbox if exactly 1 card is selected
                              if (nextIndexes.length === 1) {
                                setPrompt(optimizedResults[nextIndexes[0]].promptZh || optimizedResults[nextIndexes[0]].prompt);
                              } else if (nextIndexes.length === 0) {
                                setPrompt('');
                              }
                            }}
                            className={`optimized-suggestion-item ${isSelected ? 'active' : ''}`}
                            style={{ position: 'relative', cursor: 'pointer' }}
                          >
                            <div className="suggestion-checkbox" style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              border: '2.5px solid #2dd4bf',
                              background: isSelected ? '#2dd4bf' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#0b1120',
                              fontSize: '11px',
                              fontWeight: '900',
                              zIndex: 2,
                              transition: 'all 0.2s ease'
                            }}>
                              {isSelected ? '✓' : ''}
                            </div>
                            <div className="suggestion-badge" style={{ paddingRight: '22px' }}>{item.style}</div>
                            {item.promptZh && (
                              <div className="suggestion-zh-text" style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: '700', marginTop: '6px', lineHeight: '1.3', paddingRight: '12px' }}>
                                {item.promptZh}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '4px' }}>
                              <p className="suggestion-text" style={{ fontSize: '0.7rem', opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>{item.prompt}</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(item.prompt);
                                  alert('英文提示词已复制！');
                                }}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: '#cbd5e1', fontSize: '10px', padding: '4px 6px', cursor: 'pointer', marginLeft: '8px', flexShrink: 0, transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                title="复制英文提示词"
                              >
                                📄 复制
                              </button>
                            </div>
                            <div className="suggestion-action" style={{ fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isSelected ? '⚡ 已选中一键批量生图' : '➕ 点击加入批量生图'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Prompt Box (Unified Upload + Text Input) */}
              <div className="prompt-area" style={{ position: 'relative' }}>
                <label>📝 绘画引擎指令 Prompts (您可以手动输入，或点击 📎 附上参考图/文档)</label>

                {/* Unified Uploads Preview Zone */}
                {(image1Preview || image2Preview) && (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    {image1Preview && (
                      <div 
                        onClick={() => setEditingImageIdx(1)}
                        style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(45,212,191,0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title="点击展开编辑/标记"
                      >
                        {image1 && image1.type && image1.type.startsWith('image/') ? (
                          <img src={image1Preview} alt="Image 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#94a3b8', fontSize: '24px' }}>
                            📄
                          </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removeImage(1); }} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                      </div>
                    )}
                    {image2Preview && (
                      <div 
                        onClick={() => setEditingImageIdx(2)}
                        style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(45,212,191,0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title="点击展开编辑/标记"
                      >
                        {image2 && image2.type && image2.type.startsWith('image/') ? (
                          <img src={image2Preview} alt="Image 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#94a3b8', fontSize: '24px' }}>
                            📄
                          </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removeImage(2); }} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ position: 'relative', width: '100%' }}>
                  {/* Hidden File Inputs */}
                  <input type="file" ref={fileInputRef1} onChange={(e) => handleFileChange(e, 1)} style={{ display: 'none' }} accept="image/*,application/pdf,.txt,.doc,.docx" />
                  <input type="file" ref={fileInputRef2} onChange={(e) => handleFileChange(e, 2)} style={{ display: 'none' }} accept="image/*,application/pdf,.txt,.doc,.docx" />

                  {/* Attachment Paperclip Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      if (!image1Preview) fileInputRef1.current.click();
                      else if (!image2Preview) fileInputRef2.current.click();
                      else alert('最多只能同时上传两个参考文件！');
                    }}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      zIndex: 10,
                      transition: 'color 0.2s',
                      padding: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#2dd4bf'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    title="上传参考图或文档"
                  >
                    📎
                  </button>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="prompt-textarea"
                    placeholder="在此粘贴或修改绘画指令..."
                    rows={4}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              {/* Extra Parameters */}
              <div className="extra-settings">
                <div className="setting-control">
                  <label>📐 输出比例/尺寸</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)} className="setting-select">
                    <option value="1024x1792">9:16 长图攻略 / 竖版海报 (1024x1792)</option>
                    <option value="1024x1365">3:4 小红书种草 / 旅拍写真 (1024x1365)</option>
                    <option value="1792x1024">16:9 风光大片 / 目的地宽屏 (1792x1024)</option>
                    <option value="1024x1024">1:1 正方形图文配图 (1024x1024)</option>
                    <option value="1024x768">4:3 书籍配图 / 行程细节图 (1024x768)</option>
                  </select>
                </div>

                <div className="setting-control">
                  <label>🔥 输出格式</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="setting-select">
                    <option value="jpeg">高质量 JPEG (推荐)</option>
                    <option value="png">无损 PNG</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className={`btn-action-generate ${isProcessing ? 'loading' : ''}`}
              >
                {isProcessing
                  ? '⏳ 正在调遣 AI 绘画引擎同时进行多维度渲染，约需 5-10 秒...'
                  : selectedOptimizedIndexes.length > 1
                    ? `🚀 开启并行渲染：一次性生成已选的 ${selectedOptimizedIndexes.length} 张图 (总计消耗 ${selectedOptimizedIndexes.length * 5} 额度)`
                    : '🚀 调遣 AI 绘画引擎，开始高保真渲染 (消耗 5 额度)'
                }
              </button>
            </div>

            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleUp {
                from { transform: scale(0.9) translateY(10px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
              }
            `}</style>


            {/* Results Card (Renders progressively as slots fill up) */}
            {currentSessionOutputs.length > 0 && (
              <div className="result-card">
                <div className="result-header">
                  <h3>
                    {isProcessing 
                      ? '🎨 天工创界 AI 正在并行交付中...' 
                      : '🎨 天工创界 AI 智能生成交付物'
                    }
                  </h3>
                  <p>
                    {isProcessing
                      ? `正在多线程透镜折射并发渲染中... 已完成 (${currentSessionOutputs.filter(Boolean).length}/${currentSessionOutputs.length})`
                      : '大功告成！您可以下载原图或复制永久链接到您的电子路书/网页中'
                    }
                  </p>
                </div>

                <div className="result-body">
                  <div className="result-images-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: currentSessionOutputs.length > 1 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                    gap: '1.5rem',
                    width: '100%',
                    marginBottom: '1rem'
                  }}>
                    {currentSessionOutputs.map((out, idx) => {
                      if (!out) {
                        // Render elegant animated loader placeholder for this slot!
                        return (
                          <div key={`loading-${idx}`} className="result-item-box placeholder-loading" style={{
                            background: 'rgba(15, 23, 42, 0.2)',
                            border: '2px dashed rgba(45, 212, 191, 0.25)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            minHeight: '260px',
                            height: '100%',
                            boxShadow: 'inset 0 0 20px rgba(45, 212, 191, 0.03)',
                            overflow: 'hidden'
                          }}>
                            <div style={{ transform: 'scale(0.35)', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <SingularityLoader />
                            </div>
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '0.85rem', color: '#2dd4bf', fontWeight: '600', letterSpacing: '0.05em' }}>
                                画作方案 {idx + 1}
                              </span>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                                ⚡ 正在高并发调制像素中...
                              </p>
                            </div>
                          </div>
                        );
                      }
                      
                      if (out === 'error') {
                        return (
                          <div key={`error-${idx}`} className="result-item-box error-state" style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '16px',
                            padding: '32px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            minHeight: '430px',
                            height: '100%'
                          }}>
                            <div style={{ fontSize: '2rem' }}>⚠️</div>
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600' }}>
                                画作方案 {idx + 1} 生成失败
                              </span>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                                可能是网络超时或提示词包含违禁内容，请重试
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="result-item-box" style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
                        }}>
                          {currentSessionOutputs.length > 1 && (
                            <span style={{
                              fontSize: '0.75rem',
                              color: '#2dd4bf',
                              fontWeight: '600',
                              background: 'rgba(45, 212, 191, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              alignSelf: 'flex-start'
                            }}>
                              画作方案 {idx + 1}
                            </span>
                          )}
                          <div className="result-image-wrapper" style={{
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            height: currentSessionOutputs.length > 1 ? '260px' : 'auto',
                            maxHeight: currentSessionOutputs.length > 1 ? 'none' : '600px'
                          }}>
                            <a href={out.generatedUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%', position: 'relative' }}>
                              <img src={out.displayUrl} alt={`AI output ${idx + 1}`} className="result-img" style={{
                                width: '100%',
                                height: '100%',
                                objectFit: currentSessionOutputs.length > 1 ? 'cover' : 'contain',
                                borderRadius: '12px',
                                transition: 'transform 0.3s ease'
                              }} />
                              <div className="preview-overlay" style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                borderRadius: '12px'
                              }}>
                                🔗 点击预览大图
                              </div>
                            </a>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Gallery Section */}
        <HistoryGallery 
          email={email}
          emailStatus={emailStatus}
          initialHistoryList={historyList}
        />
      </main>

      <style jsx>{`
        .result-image-wrapper:hover .preview-overlay { opacity: 1 !important; }
        .result-image-wrapper:hover .result-img { transform: scale(1.02); }
        .gallery-img-container:hover .preview-overlay { opacity: 1 !important; }
        .gallery-img-container:hover .gallery-img { transform: scale(1.05); }
      `}</style>

      {/* Styled JSX (Next.js Built-in scoped CSS compiler) */}
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
      
      {/* Image Markup Modal */}
      <ImageMarkupModal 
        isOpen={editingImageIdx !== null}
        onClose={() => setEditingImageIdx(null)}
        imageUrl={editingImageIdx === 1 ? image1Preview : (editingImageIdx === 2 ? image2Preview : null)}
        onSave={(file, previewUrl) => {
          if (editingImageIdx === 1) {
            setImage1(file);
            setImage1Preview(previewUrl);
          } else if (editingImageIdx === 2) {
            setImage2(file);
            setImage2Preview(previewUrl);
          }
          setEditingImageIdx(null);
        }}
      />
    </div>
  );
}
