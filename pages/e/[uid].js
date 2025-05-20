// 在文件顶部导入 useRef
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
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
  // 修改初始formData
  const [formData, setFormData] = useState({
    title: '',
    wishText: '',
    name: '',
    greeting: '',
    interaction: '',
    theme: 'matrix',
    matrixTexts: [],
    dreamySkyTexts: [], // 添加dreamySkyTexts字段
    paperLetterText: ''
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
          theme: content.theme || 'matrix',
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
    
    const [aiQuery, setAiQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    // 添加 timeoutRef
    const timeoutRef = useRef(null);
    
    // 在组件卸载时清除定时器
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);
    
    const handleTextChange = (e) => {
      setLetterText(e.target.value);
      
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // 延迟更新 formData
      timeoutRef.current = setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          paperLetterTexts: [e.target.value]
        }));
      }, 3000); // 延迟500毫秒
    };
    
    const handleAiGenerate = async () => {
      if (!aiQuery.trim()) return;
      
      setAiLoading(true);
      try {
        const response = await fetch('/api/ai_generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: aiQuery }),
        });
        
        if (!response.ok) {
          throw new Error('AI生成请求失败');
        }
        
        const data = await response.json();
        
        // 从响应中提取AI生成的文本
        const generatedText = data.choices && data.choices[0] && data.choices[0].message 
          ? data.choices[0].message.content 
          : '';
        
        if (generatedText) {
          // 更新文本区域
          setLetterText(generatedText);
          // 更新formData
          setFormData(prev => ({
            ...prev,
            paperLetterTexts: [generatedText]
          }));
        }
      } catch (error) {
        setMessage(`AI生成失败: ${error.message}`);
      } finally {
        setAiLoading(false);
      }
    };
    
    return (
      <div className={styles.paperLetterEditor}>
        <h3>信纸主题文字</h3>
        <p>请输入显示在信纸主题中的文字内容</p>
        
        <div className={styles.aiGenerateGroup}>
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="输入AI提示，例如：写一段生日祝福..."
            className={styles.aiInput}
            disabled={aiLoading}
          />
          <button 
            type="button" 
            onClick={handleAiGenerate}
            className={styles.aiButton}
            disabled={aiLoading}
          >
            {aiLoading ? '生成中...' : 'AI生成'}
          </button>
        </div>
        
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
    const [aiQuery, setAiQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    
    // 定义收礼人和情境标签
    const receiverTags = ['女神', '男神', '同学', '家人', '朋友', '闺蜜', '恋人', '老师', '同事'];
    const situationTags = ['热恋', '暗恋', '思念', '分别', '回味', '祝福', '感谢', '鼓励', '道歉'];
    
    // 处理标签点击
    const handleTagClick = (tag) => {
      setAiQuery(prev => {
        // 如果已有内容，添加空格再拼接，否则直接设置
        return prev ? `${prev} ${tag}` : tag;
      });
    };
    
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
    
    const handleAiGenerate = async () => {
      if (!aiQuery.trim()) return;
      
      setAiLoading(true);
      try {
        const response = await fetch('/api/ai_generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: `你将收到一个包含"对象"和"情境"的简短描述, 请基于这些信息, 输出5到10个最能代表该情境中的情感与核心意象的关键词或短语, 可以包含emoji。输出格式为 array[string], 每个词语不超过7个字, 重点提取情感词、动词、名词或具象表达。输出范例["暗恋", "注视👀", "心跳加速❤️", "藏起心意", "默默关注", "小动作🤔", "眼神", "忐忑", "憧憬", "日记"]\n描述: ${aiQuery}` 
          }),
        });
        
        if (!response.ok) {
          throw new Error('AI生成请求失败');
        }
        
        const data = await response.json();
        
        // 添加 console.log 查看完整的返回数据
        console.log('AI生成返回数据:', data);
        
        // 从响应中提取AI生成的文本
        const generatedText = data.choices && data.choices[0] && data.choices[0].message 
          ? data.choices[0].message.content 
          : '';
        
        // 添加 console.log 查看生成的文本内容
        console.log('AI生成的文本内容:', generatedText);
        
        if (generatedText) {
          try {
            // 尝试解析生成的文本为数组
            let keywords = [];
            
            // 检查是否已经是JSON格式
            if (generatedText.trim().startsWith('[') && generatedText.trim().endsWith(']')) {
              // 添加 console.log 查看JSON解析前的文本
              console.log('尝试解析JSON:', generatedText);
              keywords = JSON.parse(generatedText);
              // 添加 console.log 查看JSON解析后的结果
              console.log('JSON解析结果:', keywords);
            } else {
              // 尝试从文本中提取关键词
              keywords = generatedText.split(/[,，、\n]/).map(item => item.trim()).filter(item => item);
              // 添加 console.log 查看文本分割后的结果
              console.log('文本分割结果:', keywords);
            }
            
            // 将关键词添加到文本列表中
            setFormData(prev => ({
              ...prev,
              [themeKey]: [...(prev[themeKey] || []), ...keywords]
            }));
          } catch (error) {
            console.error('解析AI生成内容失败:', error);
            // 添加更详细的错误日志
            console.log('解析失败的文本:', generatedText);
            console.log('错误详情:', error.message, error.stack);
            setMessage('解析AI生成内容失败，请重试');
          }
        }
      } catch (error) {
        setMessage(`AI生成失败: ${error.message}`);
      } finally {
        setAiLoading(false);
      }
    };
    
    return (
      <div className={styles.themeTextEditor}>
        <h3>{getThemeName()}文字</h3>
        
        <div className={styles.tagsContainer}>
          <div className={styles.tagSection}>
            <p className={styles.tagTitle}>收礼人：</p>
            <div className={styles.tagsList}>
              {receiverTags.map((tag, index) => (
                <span 
                  key={`receiver-${index}`} 
                  className={styles.tag}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className={styles.tagSection}>
            <p className={styles.tagTitle}>情境：</p>
            <div className={styles.tagsList}>
              {situationTags.map((tag, index) => (
                <span 
                  key={`sit-${index}`} 
                  className={styles.tag}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className={styles.aiGenerateGroup}>
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="输入AI提示，描述对象和情境..."
            className={styles.aiInput}
            disabled={aiLoading}
          />
          <button 
            type="button" 
            onClick={handleAiGenerate}
            className={styles.aiButton}
            disabled={aiLoading}
          >
            {aiLoading ? '生成中...' : 'AI生成'}
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


        <p>手动添加显示在{getThemeName()}中的文字（每行一个）</p>
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

  // 在渲染部分使用 ThemeTextEditor 替代 MatrixTextsEditor
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
              {/* 只显示三个主题：梦幻星空、信纸和黑客帝国 */}
              <div 
                className={`${styles.themeOption} ${formData.theme === 'dreamySky' ? styles.selectedTheme : ''}`}
                onClick={() => setFormData({...formData, theme: 'dreamySky'})}
              >
                <div className={styles.themePreview}>
                  <div className={styles.dreamySkyPreview}></div>
                </div>
                <div className={styles.themeInfo}>
                  <h4>梦幻星空</h4>
                  <p>自由，飞翔</p>
                  <small>以深蓝色与星空为背景，营造自由氛围</small>
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
                  <p>温馨、怀旧、真挚</p>
                  <small>模拟手写信纸效果，传递真挚情感</small>
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
                  <p>科技、未来、酷炫</p>
                  <small>黑色背景与粉色字雨，展现科技感</small>
                </div>
              </div>
            </div>
          </div>
          
          {/* 根据当前选择的主题显示相应的文字编辑器 */}
          {formData.theme === 'paperLetter' ? (<PaperLetterEditor />
        ) : (<ThemeTextEditor />
        )}
          
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? '保存中...' : '保存更改'}
          </button>
          
          {message && <p className={styles.message}>{message}</p>}
        </form>
        
        <div className={styles.formGroup}>
          <h2>分享展示页面</h2>
          <div className={styles.shareTable}>
            <table className={styles.shareTableContent}>
              <tbody>
                <tr>
                  <td className={styles.shareLabel}>二维码</td>
                  <td className={styles.shareContent}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://tbn.cc/w/${uid}`} 
                      alt="页面二维码" 
                      className={styles.qrCode}
                    />
                  </td>
                  <td className={styles.shareAction}>
                    <button 
                      type="button" 
                      className={styles.shareButton}
                      onClick={() => {
                        // 分享二维码
                        if (navigator.share) {
                          fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://tbn.cc/w/${uid}`)
                            .then(response => response.blob())
                            .then(blob => {
                              const file = new File([blob], `祝福页面_${uid}_二维码.png`, { type: 'image/png' });
                              navigator.share({
                                title: '祝福页面二维码',
                                text: '扫描二维码查看我的祝福页面',
                                files: [file]
                              }).catch(err => {
                                console.error('分享失败:', err);
                                alert('分享失败，请手动保存或分享链接');
                              });
                            });
                        } else {
                          // 如果不支持原生分享，提示用户
                          alert('您的浏览器不支持直接分享图片，请长按二维码保存或分享链接');
                        }
                      }}
                    >
                      分享二维码
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className={styles.shareLabel}>链接</td>
                  <td className={styles.shareContent}>
                    <span className={styles.linkText}>tbn.cc/w/{uid}</span>
                  </td>
                  <td className={styles.shareAction}>
                    <button 
                      type="button" 
                      className={styles.shareButton}
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: formData.title || '祝福页面',
                            text: '查看我的祝福页面',
                            url: `https://tbn.cc/w/${uid}`
                          }).catch(err => {
                            console.error('分享失败:', err);
                            navigator.clipboard.writeText(`https://tbn.cc/w/${uid}`);
                            alert('链接已复制到剪贴板');
                          });
                        } else {
                          navigator.clipboard.writeText(`https://tbn.cc/w/${uid}`);
                          alert('链接已复制到剪贴板');
                        }
                      }}
                    >
                      分享链接
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
