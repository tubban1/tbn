import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import styles from '../../styles/Edit.module.css';

export default function EditPage() {
  const router = useRouter();
  const { uid } = router.query;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // 简化表单数据，只保留标题和主题相关字段
  const [formData, setFormData] = useState({
    title: '',
    theme: 'default',
    matrixTexts: []
  });

  useEffect(() => {
    if (!uid) return;

    async function fetchPage() {
      try {
        const res = await fetch(`/api/pages/${uid}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || '获取页面失败');
        }
        
        setPage(data);
        
        // 处理页面内容
        let content = data.content;
        
        // 如果content是字符串，尝试解析为JSON
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch (e) {
            // 如果解析失败，创建默认结构
            content = {
              theme: 'default'
            };
          }
        } else if (!content) {
          // 如果content为空，创建默认结构
          content = {
            theme: 'default'
          };
        }
        
        setFormData({
          title: data.title || '',
          theme: content.theme || 'default',
          // 加载所有主题的文字设置
          matrixTexts: Array.isArray(content.matrixTexts) ? content.matrixTexts : [],
          paperLetterTexts: Array.isArray(content.paperLetterTexts) ? content.paperLetterTexts : [],
          dreamySkyTexts: Array.isArray(content.dreamySkyTexts) ? content.dreamySkyTexts : [],
          minimalBWTexts: Array.isArray(content.minimalBWTexts) ? content.minimalBWTexts : [],
          freshGreenTexts: Array.isArray(content.freshGreenTexts) ? content.freshGreenTexts : [],
          pixelRetroTexts: Array.isArray(content.pixelRetroTexts) ? content.pixelRetroTexts : [],
          goldenCelebrationTexts: Array.isArray(content.goldenCelebrationTexts) ? content.goldenCelebrationTexts : [],
          nightNeonTexts: Array.isArray(content.nightNeonTexts) ? content.nightNeonTexts : [],
          fairyForestTexts: Array.isArray(content.fairyForestTexts) ? content.fairyForestTexts : [],
          travelPostcardTexts: Array.isArray(content.travelPostcardTexts) ? content.travelPostcardTexts : [],
          futuristicTechTexts: Array.isArray(content.futuristicTechTexts) ? content.futuristicTechTexts : [],
          defaultTexts: Array.isArray(content.defaultTexts) ? content.defaultTexts : []
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [uid]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (page && password === page.password) {
      setAuthenticated(true);
    } else {
      setMessage('密码错误，请重试');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 添加一个新的文字输入组件
  const MatrixTextsEditor = () => {
    const [newText, setNewText] = useState('');
    
    const addText = () => {
      if (!newText.trim()) return;
      setFormData(prev => ({
        ...prev,
        matrixTexts: [...prev.matrixTexts, newText.trim()]
      }));
      setNewText('');
    };
    
    const removeText = (index) => {
      setFormData(prev => ({
        ...prev,
        matrixTexts: prev.matrixTexts.filter((_, i) => i !== index)
      }));
    };
    
    return (
      <div className={styles.matrixTextsEditor}>
        <h3>黑客帝国主题文字</h3>
        <p>添加显示在黑客帝国主题中的文字（每行一个）</p>
        
        <div className={styles.textInputGroup}>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="输入文字..."
            className={styles.textInput}
          />
          <button 
            type="button" 
            onClick={addText}
            className={styles.addButton}
          >
            添加
          </button>
        </div>
        
        <div className={styles.textsList}>
          {formData.matrixTexts.map((text, index) => (
            <div key={index} className={styles.textItem}>
              <span>{text}</span>
              <button 
                type="button" 
                onClick={() => removeText(index)}
                className={styles.removeButton}
              >
                删除
              </button>
            </div>
          ))}
          {formData.matrixTexts.length === 0 && (
            <p className={styles.noTexts}>暂无自定义文字，将使用默认文字</p>
          )}
        </div>
      </div>
    );
  };

  // 添加信纸主题的文字编辑器
  const PaperLetterEditor = () => {
    const [letterText, setLetterText] = useState(
      Array.isArray(formData.paperLetterTexts) && formData.paperLetterTexts.length > 0 
        ? formData.paperLetterTexts.join('\n') 
        : ''
    );
    
    const handleTextChange = (e) => {
      setLetterText(e.target.value);
      // 直接更新formData，将整段文字作为单个元素存储
      setFormData(prev => ({
        ...prev,
        paperLetterTexts: [e.target.value]
      }));
    };
    
    return (
      <div className={styles.paperLetterEditor}>
        <h3>信纸主题文字</h3>
        <p>请输入显示在信纸主题中的文字内容</p>
        
        <div className={styles.textareaGroup}>
          <textarea
            value={letterText}
            onChange={handleTextChange}
            placeholder="在此输入信纸内容..."
            className={styles.letterTextarea}
            rows={8}
          />
        </div>
        
        {!letterText && (
          <p className={styles.noTexts}>暂无自定义文字，将使用默认文字</p>
        )}
      </div>
    );
  };

  // 通用主题文字编辑器
  const ThemeTextEditor = () => {
    const [newText, setNewText] = useState('');
    const themeKey = `${formData.theme}Texts`;
    
    const addText = () => {
      if (!newText.trim()) return;
      setFormData(prev => ({
        ...prev,
        [themeKey]: [...(prev[themeKey] || []), newText.trim()]
      }));
      setNewText('');
    };
    
    const removeText = (index) => {
      setFormData(prev => ({
        ...prev,
        [themeKey]: (prev[themeKey] || []).filter((_, i) => i !== index)
      }));
    };
    
    // 获取当前主题的显示名称
    const getThemeName = () => {
      const themeMap = {
        'default': '默认主题',
        'dreamySky': '梦幻星空主题',
        'paperLetter': '信纸主题',
        'minimalBW': '极简黑白主题',
        'freshGreen': '小清新绿色主题',
        'pixelRetro': '复古像素风主题',
        'goldenCelebration': '金色庆典主题',
        'nightNeon': '夜间霓虹主题',
        'fairyForest': '童话森林主题',
        'travelPostcard': '旅行明信片主题',
        'futuristicTech': '未来科技主题',
        'matrix': '黑客帝国主题'
      };
      return themeMap[formData.theme] || formData.theme;
    };
    
    return (
      <div className={styles.themeTextEditor}>
        <h3>{getThemeName()}文字</h3>
        <p>添加显示在{getThemeName()}中的文字（每行一个）</p>
        
        <div className={styles.textInputGroup}>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="输入文字..."
            className={styles.textInput}
          />
          <button 
            type="button" 
            onClick={addText}
            className={styles.addButton}
          >
            添加
          </button>
        </div>
        
        <div className={styles.textsList}>
          {(formData[themeKey] || []).map((text, index) => (
            <div key={index} className={styles.textItem}>
              <span>{text}</span>
              <button 
                type="button" 
                onClick={() => removeText(index)}
                className={styles.removeButton}
              >
                删除
              </button>
            </div>
          ))}
          {(!formData[themeKey] || formData[themeKey].length === 0) && (
            <p className={styles.noTexts}>暂无自定义文字，将使用默认文字</p>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    
    try {
      // 构建新的content结构，保留所有主题相关信息
      const content = {
        theme: formData.theme
      };
      
      // 添加各个主题的文字设置
      Object.keys(formData).forEach(key => {
        if (key.endsWith('Texts') && Array.isArray(formData[key])) {
          content[key] = formData[key];
        }
      });
      
      const res = await fetch(`/api/pages/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: JSON.stringify(content),
          password: page.password // 验证身份
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '更新失败');
      }
      
      setMessage('更新成功！');
    } catch (err) {
      setMessage(`错误: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>加载中...</div></div>;
  }

  if (error) {
    return <div className={styles.container}><div className={styles.error}>{error}</div></div>;
  }

  if (!page) {
    return <div className={styles.container}><div className={styles.error}>页面不存在</div></div>;
  }

  if (!page.is_sold) {
    return <div className={styles.container}><div className={styles.notSold}>页面尚未售出，无法编辑</div></div>;
  }

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          <h1>请输入密码</h1>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入页面密码"
              className={styles.passwordInput}
              required
            />
            <button type="submit" className={styles.submitButton}>验证</button>
          </form>
          {message && <p className={styles.message}>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.editCard}>
        <h1>编辑祝福页面</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">标题</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="theme">选择页面主题</label>
            <div className={styles.themeSelector}>
              <div 
                className={`${styles.themeOption} ${formData.theme === 'default' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'default'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.defaultPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>默认主题</h4>
                  <p>简洁大方的基础样式</p>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'dreamySky' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'dreamySky'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.dreamySkyPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>梦幻星空主题</h4>
                  <p>神秘、浪漫、静谧</p>
                  <small>以深蓝色与星点为背景，流动星光效果，搭配梦幻字体与柔和动画</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'paperLetter' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'paperLetter'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.paperLetterPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>信纸主题</h4>
                  <p>温馨、怀旧、手写感</p>
                  <small>仿真信纸背景，带有打字机效果和笔迹动画</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'minimalBW' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'minimalBW'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.minimalBWPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>极简黑白主题</h4>
                  <p>简洁、现代、克制</p>
                  <small>黑白灰为主色调，无多余装饰，纯文字与几何排版突出重点</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'freshGreen' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'freshGreen'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.freshGreenPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>小清新绿色主题</h4>
                  <p>清爽、自然、生机</p>
                  <small>以草绿色、浅蓝色为主，搭配手绘树叶、阳光和水滴图案，轻盈动感</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'pixelRetro' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'pixelRetro'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.pixelRetroPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>复古像素风主题</h4>
                  <p>怀旧、游戏风、趣味</p>
                  <small>8-bit 像素画风，颜色跳脱，使用像素字体和动图元素</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'goldenCelebration' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'goldenCelebration'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.goldenCelebrationPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>金色庆典主题</h4>
                  <p>喜庆、奢华、节日氛围</p>
                  <small>金色、红色为主，动态烟花或礼花效果，字体有光泽渐变</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'nightNeon' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'nightNeon'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.nightNeonPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>夜间霓虹主题</h4>
                  <p>酷炫、科技、城市夜生活</p>
                  <small>深色背景搭配亮丽霓虹灯管风格的文字与边框，流光动画</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'fairyForest' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'fairyForest'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.fairyForestPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>童话森林主题</h4>
                  <p>童趣、梦幻、温暖</p>
                  <small>卡通风格森林背景，有小动物、蘑菇、小屋等元素，柔和颜色</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'travelPostcard' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'travelPostcard'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.travelPostcardPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>旅行明信片主题</h4>
                  <p>开放、探险、世界感</p>
                  <small>仿邮票明信片设计，搭配地图、护照印章、飞机路径动画</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'futuristicTech' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'futuristicTech'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.futuristicTechPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>未来科技主题</h4>
                  <p>高科技、现代、未来感</p>
                  <small>线条构图、光效边框、玻璃拟物风（glassmorphism），UI 像操作系统面板</small>
                </div>
              </div>
              
              <div 
                className={`${styles.themeOption} ${formData.theme === 'matrix' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'matrix'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.matrixPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>黑客帝国主题</h4>
                  <p>酷炫、神秘、科技感</p>
                  <small>紫色霓虹文字雨效果，黑色背景，营造出电影《黑客帝国》的视觉风格</small>
                </div>
              </div>
            </div>
          </div>
          
          {/* 根据当前选择的主题显示相应的文字编辑器 */}
          {formData.theme === 'matrix' && <MatrixTextsEditor />}
          {formData.theme === 'paperLetter' && <PaperLetterEditor />}
          {formData.theme !== 'matrix' && formData.theme !== 'paperLetter' && <ThemeTextEditor />}
          
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? '保存中...' : '保存更改'}
          </button>
        </form>
        
        {message && <p className={styles.message}>{message}</p>}
        
        <div className={styles.previewSection}>
          <h2>预览</h2>
          <div className={styles.preview}>
            <h1>{formData.title}</h1>
            <p>主题: {formData.theme}</p>
          </div>
        </div>
      </div>
    </div>
  );
}