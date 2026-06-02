const fs = require('fs');

const file = fs.readFileSync('pages/multimage.js', 'utf8');

let newFile = file;

// 1. Add states
const statesToAdd = `
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\\.[^\s@]+$/;
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
`;

newFile = newFile.replace("const [editingImageIdx, setEditingImageIdx] = useState(false);", "const [editingImageIdx, setEditingImageIdx] = useState(false);\n" + statesToAdd);


// 2. Update generate API calls
newFile = newFile.replace(/formData\.append\('prompt', scene\.prompt\);/g, "formData.append('prompt', scene.prompt);\n          if (email) formData.append('email', email);");
newFile = newFile.replace(/size: '1024x1024'/g, "size: '1024x1024',\n            email");

// 3. Add loadHistory inside GenerateAll after promise.all
newFile = newFile.replace(/setInfoMessage\('✅ 批量生成完毕！'\);/, "setInfoMessage('✅ 批量生成完毕！');\n    if (email) {\n      const lastRes = await axios.post('/api/timage/pre-check', { email });\n      if (lastRes.data?.success) setCredits(lastRes.data.credits);\n      loadHistory(email);\n    }");


// 4. Update the Header UI
const headerReplacement = `
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
`;

newFile = newFile.replace(/<div className="header">[\s\S]*?<\/div>/, headerReplacement);


// 5. Update results grid item to add download buttons
const resultItemReplacement = `
                  <div className="result-header">镜头 {idx + 1}</div>
                  {res === null ? (
                    <div className="result-loading">
                       <SingularityLoader />
                    </div>
                  ) : res === 'error' ? (
                    <div className="result-error">生成失败</div>
                  ) : (
                    <>
                      <img src={res} alt={\`Result \${idx}\`} className="result-img" />
                      <div className="result-actions" style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                        <a href={res} target="_blank" rel="noreferrer" className="btn-result-action secondary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>👁️ 预览</a>
                        <a href={res} download={\`result_\${idx}_\${Date.now()}.jpg\`} className="btn-result-action secondary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>💾 下载</a>
                      </div>
                    </>
                  )}
`;

newFile = newFile.replace(/<div className="result-header">镜头 \{idx \+ 1\}<\/div>[\s\S]*?<\/div>\s*\)\s*:\s*\(\s*<img src=\{res\}.*?\/>\s*\)}/, resultItemReplacement);

// 6. Add History Section
const historySection = `
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
                        <a href={item.generated_url} target="_blank" rel="noreferrer" className="gallery-action-link">预览</a>
                        <a href={item.generated_url} download={\`history_\${item.id}.jpg\`} className="gallery-action-link">下载</a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.generated_url);
                            alert('复制成功！');
                          }}
                          className="gallery-action-btn"
                        >
                          复制链接
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
`;

newFile = newFile.replace(/<\/div>\s*<ImageMarkupModal/, historySection + '\n      </div>\n\n      <ImageMarkupModal');

fs.writeFileSync('pages/multimage.js', newFile);
console.log('patched multimage.js successfully');
