import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import Header from '../components/Header';
import SingularityLoader from '../components/SingularityLoader';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VIDEO_COST = 50;

const aspectOptions = [
  { value: '16:9', label: '16:9 横屏短片' },
  { value: '9:16', label: '9:16 竖屏短视频' },
  { value: '1:1', label: '1:1 方形视频' },
];

const durationOptions = [
  { value: 4, label: '4 秒' },
  { value: 6, label: '6 秒' },
  { value: 8, label: '8 秒' },
];

const motionOptions = [
  { value: '', label: '智能镜头' },
  { value: 'slow_push_in', label: '缓慢推进' },
  { value: 'orbit', label: '环绕运镜' },
  { value: 'handheld', label: '手持纪实' },
  { value: 'drone', label: '航拍拉升' },
];

export default function TVideoPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [cameraMotion, setCameraMotion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [operationResult, setOperationResult] = useState(null);

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

  const canSubmit = useMemo(() => {
    return !isGenerating && prompt.trim().length > 0;
  }, [isGenerating, prompt]);

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
      const response = await axios.post('/api/timage/pre-check', {
        email: emailToVerify,
        password: passwordToVerify,
      });

      if (response.data?.success) {
        setEmailStatus('verified');
        setCredits(response.data.credits);
        localStorage.setItem('timage_email', emailToVerify);
        localStorage.setItem('timage_password', passwordToVerify);
        localStorage.setItem('timage_verified', 'true');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || '登录失败，请检查账号密码或网络');
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
    setOperationResult(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage('请输入视频描述。');
      return;
    }
    if (emailStatus !== 'verified') {
      setErrorMessage('请先在右上角登录 / 注册后再生成视频。');
      return;
    }
    if (credits < VIDEO_COST) {
      setErrorMessage(`积分不足，生成视频需要 ${VIDEO_COST} 积分，当前剩余 ${credits}。`);
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setInfoMessage('');
    setOperationResult(null);

    try {
      const response = await axios.post('/api/tvideo/generate', {
        email,
        password,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        aspectRatio,
        durationSeconds,
        cameraMotion,
      });

      setCredits(response.data.credits);
      setOperationResult(response.data);
      setInfoMessage('视频任务已提交，已扣除 50 积分。');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || '视频任务提交失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = async (text, successText) => {
    try {
      await navigator.clipboard.writeText(text);
      setInfoMessage(successText);
    } catch (err) {
      console.error(err);
      setErrorMessage('复制失败，请手动选择文本复制。');
    }
  };

  const operationText = operationResult
    ? JSON.stringify(operationResult.operation || operationResult, null, 2)
    : '';

  return (
    <div className="video-workbench">
      <Head>
        <title>天工创界 | AI 生视频工作台</title>
      </Head>

      <Header
        title="天工创界"
        subtitle="AI 生视频工作台"
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

      <main className="video-main">
        <section className="panel idea-panel">
          <div className="panel-title">
            <span>视频构想</span>
            <strong>{VIDEO_COST} 积分 / 次</strong>
          </div>

          <label className="field">
            <span>核心画面描述</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="例如：清晨的川西雪山公路，一辆越野车从薄雾中驶来，镜头低机位缓慢推进，阳光照亮车身和远处雪峰。"
              rows={10}
            />
          </label>

          <label className="field">
            <span>不希望出现</span>
            <textarea
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              placeholder="例如：模糊、畸形手指、文字水印、低清晰度、画面抖动"
              rows={4}
            />
          </label>

          <div className="prompt-actions">
            <button
              type="button"
              onClick={() => copyText(prompt, '已复制视频描述。')}
              disabled={!prompt.trim()}
            >
              复制描述
            </button>
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setNegativePrompt('');
                setOperationResult(null);
                setErrorMessage('');
                setInfoMessage('');
              }}
            >
              清空
            </button>
          </div>
        </section>

        <section className="panel control-panel">
          <div className="panel-title">
            <span>生成参数</span>
            <strong>Veo 3.1 Fast</strong>
          </div>

          <label className="field">
            <span>画幅比例</span>
            <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
              {aspectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>视频时长</span>
            <select
              value={durationSeconds}
              onChange={(event) => setDurationSeconds(Number(event.target.value))}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>镜头运动</span>
            <select value={cameraMotion} onChange={(event) => setCameraMotion(event.target.value)}>
              {motionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="credit-card">
            <span>本次消耗</span>
            <strong>{VIDEO_COST}</strong>
            <small>提交长任务后扣除；接口失败会自动退回。</small>
          </div>

          <button className="generate-button" type="button" onClick={handleGenerate} disabled={!canSubmit}>
            {isGenerating ? '提交视频任务中...' : '生成视频任务'}
          </button>
        </section>

        <section className="panel result-panel">
          <div className="panel-title">
            <span>任务结果</span>
            {operationResult?.operationName && <strong>Long Running</strong>}
          </div>

          {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
          {infoMessage && <div className="alert alert-info">{infoMessage}</div>}

          {isGenerating && (
            <div className="loading-stage">
              <SingularityLoader text="正在向视频引擎提交任务..." />
            </div>
          )}

          {!isGenerating && !operationResult && (
            <div className="empty-state">
              <div className="orb" />
              <h2>等待一个会动的画面</h2>
              <p>左侧写下镜头，设定比例与时长，提交后这里会显示视频长任务返回信息。</p>
            </div>
          )}

          {!isGenerating && operationResult && (
            <div className="operation-card">
              <div className="operation-head">
                <div>
                  <span>任务已创建</span>
                  <strong>{operationResult.operationName || '未返回 operationName'}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(operationText, '已复制完整任务返回。')}
                >
                  复制返回
                </button>
              </div>
              <pre>{operationText}</pre>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .video-workbench {
          min-height: 100vh;
          background:
            radial-gradient(circle at 16% 12%, rgba(45, 212, 191, 0.16), transparent 26%),
            radial-gradient(circle at 84% 18%, rgba(56, 189, 248, 0.12), transparent 28%),
            linear-gradient(135deg, #07100f 0%, #101b1d 54%, #08110f 100%);
          color: #e7f7f4;
        }

        .video-main {
          display: grid;
          grid-template-columns: minmax(300px, 0.9fr) minmax(260px, 0.62fr) minmax(360px, 1.15fr);
          gap: 16px;
          padding: 24px;
        }

        .panel {
          min-height: calc(100vh - 150px);
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 8px;
          background: rgba(9, 20, 21, 0.82);
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(20px);
          padding: 18px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          color: #9ee7dc;
          font-size: 14px;
          letter-spacing: 0;
        }

        .panel-title strong {
          color: #f6b44b;
          font-size: 12px;
          font-weight: 600;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .field span {
          color: #bddad6;
          font-size: 13px;
        }

        textarea,
        select {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 8px;
          background: rgba(15, 32, 34, 0.92);
          color: #effffb;
          outline: none;
          font-size: 14px;
          line-height: 1.6;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        textarea {
          resize: vertical;
          padding: 14px;
        }

        select {
          height: 44px;
          padding: 0 12px;
        }

        textarea:focus,
        select:focus {
          border-color: rgba(45, 212, 191, 0.72);
          box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.12);
        }

        .prompt-actions {
          display: flex;
          gap: 10px;
        }

        .prompt-actions button,
        .operation-head button {
          border: 1px solid rgba(45, 212, 191, 0.3);
          border-radius: 8px;
          background: rgba(45, 212, 191, 0.08);
          color: #a7f3d0;
          cursor: pointer;
          padding: 10px 14px;
        }

        .prompt-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .credit-card {
          display: grid;
          gap: 8px;
          margin: 20px 0;
          padding: 18px;
          border: 1px solid rgba(246, 180, 75, 0.24);
          border-radius: 8px;
          background: rgba(246, 180, 75, 0.08);
        }

        .credit-card span,
        .credit-card small {
          color: #e7c993;
          font-size: 13px;
        }

        .credit-card strong {
          color: #f6b44b;
          font-size: 42px;
          line-height: 1;
        }

        .generate-button {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(135deg, #14b8a6, #38bdf8);
          color: #031312;
          cursor: pointer;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 14px 40px rgba(20, 184, 166, 0.24);
        }

        .generate-button:disabled {
          cursor: not-allowed;
          filter: grayscale(0.6);
          opacity: 0.55;
        }

        .alert {
          margin-bottom: 12px;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 13px;
        }

        .alert-error {
          border: 1px solid rgba(248, 113, 113, 0.34);
          background: rgba(127, 29, 29, 0.32);
          color: #fecaca;
        }

        .alert-info {
          border: 1px solid rgba(45, 212, 191, 0.26);
          background: rgba(20, 184, 166, 0.12);
          color: #ccfbf1;
        }

        .loading-stage,
        .empty-state {
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state {
          flex-direction: column;
          text-align: center;
          color: #9db9b5;
        }

        .empty-state h2 {
          margin: 18px 0 8px;
          color: #e7f7f4;
          font-size: 22px;
        }

        .empty-state p {
          max-width: 360px;
          margin: 0;
          line-height: 1.7;
        }

        .orb {
          width: 96px;
          height: 96px;
          border: 1px solid rgba(45, 212, 191, 0.36);
          border-radius: 50%;
          background:
            linear-gradient(135deg, rgba(45, 212, 191, 0.3), rgba(56, 189, 248, 0.12)),
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.38), transparent 34%);
          box-shadow: 0 0 60px rgba(45, 212, 191, 0.22);
        }

        .operation-card {
          display: grid;
          gap: 14px;
        }

        .operation-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .operation-head div {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .operation-head span {
          color: #8fb3ae;
          font-size: 12px;
        }

        .operation-head strong {
          color: #e7f7f4;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        pre {
          max-height: 520px;
          overflow: auto;
          margin: 0;
          padding: 16px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 8px;
          background: rgba(3, 10, 11, 0.72);
          color: #b7f5ec;
          font-size: 12px;
          line-height: 1.65;
        }

        @media (max-width: 1180px) {
          .video-main {
            grid-template-columns: 1fr;
          }

          .panel {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  );
}
