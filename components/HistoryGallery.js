import React, { useState } from 'react';
import axios from 'axios';

export default function HistoryGallery({ email, emailStatus, initialHistoryList = [] }) {
  const [historyList, setHistoryList] = useState(initialHistoryList);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Update historyList if initialHistoryList changes from parent (e.g. on initial load)
  React.useEffect(() => {
    setHistoryList(initialHistoryList);
    setPage(1);
    setHasMore(initialHistoryList.length >= 12); // Assuming 12 is the initial limit
  }, [initialHistoryList]);

  const loadMore = async () => {
    if (!email) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await axios.post('/api/timage/history', { 
        email, 
        limit: 12,
        offset: (nextPage - 1) * 12 
      });
      if (res.data?.success) {
        const newImages = res.data.images || [];
        setHistoryList(prev => [...prev, ...newImages]);
        setPage(nextPage);
        if (newImages.length < 12) {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error('Failed to load more history:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (emailStatus !== 'verified') return null;

  return (
    <section className="gallery-section">
      <div className="gallery-header">
        <h3>📦 我的作品库</h3>
        <p>保存您历史生成的全部高清图文</p>
      </div>

      {historyList.length === 0 ? (
        <div className="gallery-empty">您还没有生成过任何画作，在上方填写参数生成您的第一张作品吧！</div>
      ) : (
        <>
          <div className="gallery-grid">
            {historyList.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="gallery-card">
                <div className="gallery-img-container" style={{ position: 'relative' }}>
                  <a href={item.generated_url} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative' }}>
                    <img src={item.display_url || item.generated_url} alt={item.style} className="gallery-img" style={{ transition: 'transform 0.3s ease' }} />
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
                <div className="gallery-card-info" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="gallery-style-badge">{item.style === 'edit' ? '📸 AI编辑' : '✨ 文本生成'}</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(item.prompt || '');
                        const btn = e.currentTarget;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '✅ 已复制';
                        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#fff',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      📋 复制提示词
                    </button>
                  </div>
                  <p className="gallery-prompt-text">{item.prompt || '作品'}</p>
                </div>
              </div>
            ))}
          </div>
          
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '2rem' }}>
              <button 
                onClick={loadMore} 
                disabled={isLoadingMore}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  color: '#60a5fa',
                  padding: '10px 24px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.1)'}
              >
                {isLoadingMore ? '⏳ 正在加载...' : '⬇️ 加载更多'}
              </button>
            </div>
          )}
        </>
      )}
      
      <style jsx>{`
        .gallery-section {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--color-border);
        }
        .gallery-header h3 {
          font-family: var(--font-title);
          font-size: 1.5rem;
          color: #f1f5f9;
          margin-bottom: 0.5rem;
        }
        .gallery-header p {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .gallery-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .gallery-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.4);
        }
        .gallery-img-container {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background-color: #0b1120;
        }
        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-card-info {
          padding: 1rem;
        }
        .gallery-style-badge {
          font-size: 0.7rem;
          background-color: rgba(45, 212, 191, 0.1);
          color: #2dd4bf;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid rgba(45, 212, 191, 0.2);
        }
        .gallery-prompt-text {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.5;
        }
        .gallery-empty {
          text-align: center;
          padding: 3rem;
          color: var(--color-text-muted);
          background-color: rgba(15, 23, 42, 0.3);
          border-radius: 12px;
          border: 1px dashed var(--color-border);
        }
        .gallery-img-container:hover .preview-overlay { opacity: 1 !important; }
        .gallery-img-container:hover .gallery-img { transform: scale(1.05); }
      `}</style>
    </section>
  );
}
