import { useState, useEffect } from 'react';
import styles from '../styles/Admin.module.css';

export default function Admin() {
  const [pageCount, setPageCount] = useState(10);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 获取所有页面
  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/pages');
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('获取页面失败:', error);
      setMessage('获取页面失败');
    }
  };

  // 创建页面
  const createPages = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/pages/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: pageCount }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`成功创建 ${data.created} 个页面`);
        fetchPages(); // 刷新页面列表
      } else {
        setMessage(`创建失败: ${data.error}`);
      }
    } catch (error) {
      console.error('创建页面失败:', error);
      setMessage('创建页面失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 更新页面状态
  const updatePageStatus = async (uid, field, value) => {
    try {
      const response = await fetch(`/api/pages/${uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setPages(pages.map(page => 
          page.uid === uid ? { ...page, [field]: value } : page
        ));
      } else {
        const data = await response.json();
        setMessage(`更新失败: ${data.error}`);
        // 恢复原状态
        fetchPages();
      }
    } catch (error) {
      console.error('更新页面状态失败:', error);
      setMessage('更新页面状态失败');
      fetchPages();
    }
  };

  // 处理点击页面信息对话框
  const handleCopyPageInfo = (e, page) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(e.currentTarget);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 尝试复制到剪贴板
    try {
      document.execCommand('copy');
      setMessage('页面信息已复制到剪贴板');
    } catch (err) {
      setMessage('请手动复制页面信息');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>页面管理</h1>
      
      {/* 创建页面区域 */}
      <div className={styles.createSection}>
        <h2>创建页面</h2>
        <div className={styles.inputGroup}>
          <label htmlFor="pageCount">页面数量:</label>
          <input
            id="pageCount"
            type="number"
            min="1"
            max="100"
            value={pageCount}
            onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
            className={styles.numberInput}
          />
          <button 
            onClick={createPages} 
            disabled={loading}
            className={styles.createButton}
          >
            {loading ? '创建中...' : '创建页面'}
          </button>
        </div>
        {message && <p className={styles.message}>{message}</p>}
      </div>
      
      {/* 页面列表 */}
      <div className={styles.pagesSection}>
        <h2>页面列表</h2>
        <table className={styles.pagesTable}>
          <thead>
            <tr>
              <th>UID</th>
              <th>密码</th>
              <th>标题</th>
              <th>创建时间</th>
              <th>已分配</th>
              <th>已售出</th>
              <th>页面信息</th>
            </tr>
          </thead>
          <tbody>
            {pages.length > 0 ? (
              pages.map((page) => (
                <tr key={page.uid}>
                  <td>{page.uid}</td>
                  <td>{page.password}</td>
                  <td>{page.title}</td>
                  <td>{new Date(page.created_at).toLocaleString()}</td>
                  <td>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={page.is_assigned}
                        onChange={(e) => updatePageStatus(page.uid, 'is_assigned', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </td>
                  <td>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={page.is_sold}
                        onChange={(e) => updatePageStatus(page.uid, 'is_sold', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </td>
                  <td>
                    <div 
                      className={styles.pageInfoBox}
                      onClick={(e) => handleCopyPageInfo(e, page)}
                      title="点击复制"
                    >
                      展示页面: tbn.cc/w/{page.uid}<br/>
                      编辑页面: tbn.cc/e/{page.uid}<br/>
                      密码: {page.password}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className={styles.noData}>暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
