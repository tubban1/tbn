import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../../styles/matrix/style.module.css';
import { createMatrixRainEffect, createDynamicBackground } from '../../styles/matrix/script';

export default function WishPage() {
  const router = useRouter();
  const { uid } = router.query;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 将所有 Hooks 声明移到组件顶层
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [likeCount, setLikeCount] = useState(0);

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
        console.error('获取评论失败:', err);
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
    }).catch(err => console.error('记录访问失败:', err));
  }, [uid]);

  // 创建动态背景
  useEffect(() => {
    if (!uid) return;
    
    // 调用拆分出去的函数
    const cleanupBackground = createDynamicBackground(styles);
    
    // 清理函数
    return cleanupBackground;
  }, [uid, styles.container, styles.particle]);

  // 创建黑客帝国文字雨效果
  useEffect(() => {
    if (!uid || !page) return;
    
    // 解析页面内容
    const content = typeof page.content === 'string' ? 
      JSON.parse(page.content || '{"wishText":"","name":"","greeting":"","interaction":"","theme":"default","matrixTexts":[]}') : 
      (page.content || {"wishText":"","name":"","greeting":"","interaction":"","theme":"default","matrixTexts":[]});
    
    if (!content.theme || content.theme !== 'matrix') return;
    
    // 调用拆分出去的函数
    const cleanupMatrixRain = createMatrixRainEffect(styles, content);
    
    // 返回清理函数
    return cleanupMatrixRain;
  }, [uid, page, styles]);

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
      console.error('提交评论失败:', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loading}>加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={styles.container}><div className={styles.error}>{error}</div></div>;
  }

  if (!page) {
    return <div className={styles.container}><div className={styles.error}>页面不存在</div></div>;
  }

  if (!page.is_assigned) {
    return <div className={styles.container}><div className={styles.notAssigned}>页面还未分配</div></div>;
  }

  // 解析页面内容
  const content = typeof page.content === 'string' ? 
    JSON.parse(page.content || '{"wishText":"","name":"","greeting":"","interaction":"","theme":"default","matrixTexts":[]}') : 
    (page.content || {"wishText":"","name":"","greeting":"","interaction":"","theme":"default","matrixTexts":[]});
  
  // 确保 interaction 是字符串而不是对象
  const interactionText = typeof content.interaction === 'object' ? 
    (content.interaction.type || '点击下方按钮，送上你的祝福') : 
    (content.interaction || '点击下方按钮，送上你的祝福');

  // 确定主题类名
  const themeClass = content.theme ? styles[content.theme] : '';

  return (
    <div className={`${styles.container} ${themeClass}`}>
      <Head>
        <title>{page.title || '祝福页面'}</title>
        <meta name="description" content={`${page.title || '祝福页面'} - 个性化祝福`} />
      </Head>
      
      {/* 标题已被删除 */}
    </div>
  );
}