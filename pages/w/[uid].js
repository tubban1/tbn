import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { themes } from '../../styles/index';
import commonStyles from '../../styles/common.module.css';

// 动态导入主题脚本
const themeScripts = {
  matrix: () => import('../../styles/matrix/script'),
  paperLetter: () => import('../../styles/paperLetter/script'),
  dreamySky: () => import('../../styles/dreamySky/script')  // 添加梦幻星空主题脚本
  // 可以根据需要添加更多主题脚本
};

export default function WishPage() {
  const router = useRouter();
  const { uid } = router.query;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeStyle, setThemeStyle] = useState(null);
  const [themeScript, setThemeScript] = useState(null);
  
  // 将所有 Hooks 声明移到组件顶层
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  
  // 获取页面数据
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [uid]);

  // 根据主题加载对应的样式和脚本
  useEffect(() => {
    if (!page) return;

    // 解析页面内容
    const content = typeof page.content === 'string' ? 
      JSON.parse(page.content || '{"wishText":"","name":"","greeting":"","interaction":"","theme":"matrix","matrixTexts":[]}') : 
      (page.content || {"wishText":"","name":"","greeting":"","interaction":"","theme":"matrix","matrixTexts":[]});
    
    // 获取主题名称
    const themeName = content.theme || '';
    
    // 设置主题样式
    setThemeStyle(themes[themeName]);
    
    // 如果有对应的主题脚本，加载它
    if (themeScripts[themeName]) {
      themeScripts[themeName]().then(module => {
        setThemeScript(module);
      }).catch(err => {
        // 删除console.error
      });
    } else {
      setThemeScript(null);
    }
  }, [page]);

  // 应用主题特效
  useEffect(() => {
    if (!themeStyle || !themeScript || !page) return;
    
    // 解析页面内容
    const content = typeof page.content === 'string' ? 
      JSON.parse(page.content || '{"wishText":"","name":"","greeting":"","interaction":"","theme":"matrix","matrixTexts":[]}') : 
      (page.content || {"wishText":"","name":"","greeting":"","interaction":"","theme":"matrix","matrixTexts":[]});
    
    let cleanup = () => {};
    
    // 根据主题名称应用不同的特效
    if (content.theme === 'matrix' && themeScript.createMatrixRainEffect) {
      // 只应用文字雨效果，移除动态背景效果
      cleanup = themeScript.createMatrixRainEffect(themeStyle, content);
    } else if (content.theme === 'paperLetter' && themeScript.createPaperEffects) {
      cleanup = themeScript.createPaperEffects(themeStyle, content);
    } else if (content.theme === 'dreamySky' && themeScript.createDreamySkyEffect) {
      // 添加梦幻星空主题特效
      cleanup = themeScript.createDreamySkyEffect(themeStyle, content);
    }
    // 可以添加更多主题的特效处理
    
    return cleanup;
  }, [themeStyle, themeScript, page]);

  // 获取评论
  useEffect(() => {
    if (!uid) return;
    
    async function fetchComments() {
      try {
        const res = await fetch(`/api/comments?page_uid=${uid}`);
        const data = await res.json();
        
        if (res.ok) {
          setComments(data);
        }
      } catch (err) {
        // 删除console.error
      }
    }
    
    fetchComments();
  }, [uid]);

  // 记录页面访问
  useEffect(() => {
    if (!uid) return;
    
    fetch('/api/page_views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_uid: uid }),
    }).catch(err => {
      // 删除console.error
    });
  }, [uid]);

  // 处理点赞
  const handleLike = () => {
    setLikeCount(prev => prev + 1);
  };

  // 处理提交评论
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_uid: uid,
          author: authorName.trim() || '匿名',
          content: newComment
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // 添加新评论到列表
        setComments([...comments, data]);
        // 清空输入
        setNewComment('');
        setAuthorName('');
      }
    } catch (err) {
      // 删除console.error
    }
  };

  // 切换评论面板显示状态
  const toggleComments = () => {
    setShowComments(!showComments);
  };

  if (loading) {
    return (
      <div className={commonStyles.container}>
        <div className={commonStyles.loadingContainer}>
          <div className={commonStyles.loadingSpinner}></div>
          <div className={commonStyles.loading}>加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={commonStyles.container}><div className={commonStyles.error}>{error}</div></div>;
  }

  if (!page) {
    return <div className={commonStyles.container}><div className={commonStyles.error}>页面不存在</div></div>;
  }

  if (!page.is_assigned) {
    return <div className={commonStyles.container}><div className={commonStyles.notAssigned}>页面还未分配</div></div>;
  }

  /*/ 解析页面内容
  const content = typeof page.content === 'string' ? 
    JSON.parse(page.content || '{"wishText":"","name":"","greeting":"","interaction":"","theme":"default","matrixTexts":[]}') : 
    (page.content || {"wishText":"","name":"","greeting":"","interaction":"","theme":"default","matrixTexts":[]});
  
  // 确保 interaction 是字符串而不是对象
  const interactionText = typeof content.interaction === 'object' ? 
    (content.interaction.type || '点击下方按钮，送上你的祝福') : 
    (content.interaction || '点击下方按钮，送上你的祝福');
*/

  // 使用动态加载的主题样式
  const styles = themeStyle || themes.matrix;

  return (
    <div className={`${commonStyles.container} ${styles.container}`}>
      <Head>
        <title>{page.title || '祝福页面'}</title>
        <meta name="description" content={`${page.title || '祝福页面'} - 个性化祝福`} />
      </Head>
      
      {/* 评论气泡按钮 */}
      <div 
        className={commonStyles.commentBubble} 
        onClick={toggleComments}
        title="查看留言"
      >
        <div className={commonStyles.bubbleInner}>
          <span className={commonStyles.commentIcon}>💬</span>
          <span className={commonStyles.commentCount}>{comments.length}</span>
        </div>
      </div>
      
      {/* 评论弹出面板 */}
      {showComments && (
        <div className={commonStyles.commentPanel}>
          <div className={commonStyles.commentHeader}>
            <h3>留言板</h3>
            <button className={commonStyles.closeButton} onClick={toggleComments}>×</button>
          </div>
          
          <form onSubmit={handleSubmitComment} className={commonStyles.commentForm}>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="您的名字"
              className={commonStyles.commentAuthorInput}
            />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下您的祝福..."
              className={commonStyles.commentInput}
            />
            <button type="submit" className={commonStyles.commentButton}>
              发送祝福
            </button>
          </form>
          
          <div className={commonStyles.commentsList}>
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <div key={index} className={commonStyles.commentItem}>
                  <div className={commonStyles.commentAuthor}>
                    {comment.author || '匿名'}
                  </div>
                  <div className={commonStyles.commentDate}>
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                  <div className={commonStyles.commentContent}>
                    {comment.content}
                  </div>
                </div>
              ))
            ) : (
              <div className={commonStyles.noComments}>暂无留言</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
