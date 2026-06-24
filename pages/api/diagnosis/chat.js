import { query } from '../../../lib/db';
import { extractDiagnosisProfile, extractDiagnosisProfileLocally } from '../../../lib/diagnosis_extract';
import axios from 'axios';
import https from 'https';

function runAfterResponse(res, task) {
  res.on('finish', () => {
    task().catch((error) => {
      console.error('[Diagnosis Background Task Error]:', error);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { sessionId, message } = req.body || {};

  if (!sessionId || !message || message.trim() === '') {
    return res.status(400).json({ error: '缺少会话 ID 或消息内容' });
  }

  // 立即开始流式响应，保证毫秒级 TTFB 反馈
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  // 第一时间写回开场轻量 Chunk，打消等待焦虑
  res.write("我先记录下这些信息，正在深度为您分析中...\n\n");

  try {
    // 1. 获取当前会话状态，判断是否存在
    const sessions = await query(`SELECT * FROM diagnosis_sessions WHERE id = ?`, [sessionId]);
    if (sessions.length === 0) {
      res.write("抱歉，未能找到该诊断会话。请刷新重试。");
      return res.end();
    }

    // 2. 将用户消息写入消息表
    await query(
      `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
      [sessionId, 'user', message]
    );

    // 3. 过滤纯提问、短语或闲聊，避免不必要的画像提取
    const shouldExtract = (text) => {
      if (!text) return false;
      const t = text.trim();
      if (t.length < 5) return false;
      if (/^(你好|您好|在吗|在么|谢谢|感谢|hello|hi|👋)$/i.test(t)) return false;
      if (
        t.includes('？') || 
        t.includes('?') || 
        /^(还需要|还要|需要哪些|哪些信息|是什么|怎么做|如何|为什么|啥|什么)/.test(t) ||
        /(什么信息|哪些信息|还要提供什么|还需要提供什么)/.test(t)
      ) return false;
      return true;
    };

    if (shouldExtract(message)) {
      // 同步发起本地快速粗提取，秒级回馈完整度跳变！
      await extractDiagnosisProfileLocally(sessionId, message);
      // 立刻触发后台异步慢提取任务，不等 AI 对话回复！
      runAfterResponse(res, () => extractDiagnosisProfile(sessionId, message));
    }

    // 5. 读取当前已保存的画像事实作为上下文
    const profiles = await query(`SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?`, [sessionId]);
    let currentFacts = {};
    if (profiles.length > 0) {
      try {
        currentFacts = typeof profiles[0].known_facts === 'string' ? JSON.parse(profiles[0].known_facts) : profiles[0].known_facts || {};
      } catch (e) {
        currentFacts = profiles[0].known_facts || {};
      }
    }

    // 6. 读取最近的对话消息作为 AI 对话的上下文 (最多拉取 15 条)
    const historyMessages = await query(
      `SELECT sender, content FROM diagnosis_messages WHERE session_id = ? ORDER BY id ASC LIMIT 15`,
      [sessionId]
    );

    // 7. 读取 AI 配置
    const API_KEY = process.env.VECTORENGINE_GEMINI_KEY;
    const API_BASE = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
    const MODEL = process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';

    if (!API_KEY) {
      const errReply = 'API配置错误: VECTORENGINE_GEMINI_KEY 未配置';
      await query(
        `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
        [sessionId, 'agent', errReply]
      );
      res.write(errReply);
      return res.end();
    }

    // 构造快速对话的 Prompt
    const conversationContext = historyMessages.map(msg => {
      return `${msg.sender === 'user' ? '用户' : '转型顾问 Agent'}: ${msg.content}`;
    }).join('\n\n');

    const promptUserContent = `
当前已整理的企业画像事实 (knownFacts):
${JSON.stringify(currentFacts, null, 2)}

当前的对话历史记录:
${conversationContext}

请基于最新的对话历史，针对用户的陈述进行追问或诊断建议回复。
`;

    const systemPrompt = `你是一位资深的企业 AI 转型咨询专家和架构师。你的目标是通过多轮访谈对话，深入了解企业的各个维度，以便评估其 AI 转型成熟度并输出方案。

【回复原则】：
1. 你的回复需要专业、共情、充满启发性，并采用中文。
2. 保持与用户的良性沟通，循序渐进地引导他们提供有关其企业的流程、数据基础 and 业务目标的细节。
3. 请直接输出你的对话回复文本，严禁返回 JSON 格式，也不要用任何 markdown 标签（如 \`\`\`json）包裹。
4. 特别注意：如果用户在最新陈述中表示出困惑、否认先前的目标或方向（例如表示自己没有关注降本增效），你必须在回复的最开始首先诚恳致歉并承认理解偏差，随即引导用户重新确认其真正的诊断方向，而不是固执强推假设。`;

    let stream;
    try {
      // 发起大模型流式请求
      const response = await axios.post(
        `${API_BASE}/chat/completions`,
        {
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptUserContent }
          ],
          temperature: 0.6,
          stream: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          timeout: 15000, // 设置 15 秒超时控制
          responseType: 'stream',
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }
      );
      stream = response.data;
    } catch (apiErr) {
      console.error('[Chat API Request Error]:', apiErr);
      throw apiErr;
    }

    let hasReceivedData = false;
    let fullReply = '';

    // 设置 10 秒无数据返回的超时兜底
    const timeoutTimer = setTimeout(() => {
      if (!hasReceivedData) {
        console.warn('[Chat Stream Timeout] No chunk received within 10s, triggering fallback');
        if (stream) {
          stream.destroy(new Error('timeout'));
        } else {
          handleFallback(res, sessionId, '我先记录下这些信息，正在深度为您分析中...\n\n');
        }
      }
    }, 10000);

    let buffer = '';

    stream.on('data', chunk => {
      hasReceivedData = true;
      clearTimeout(timeoutTimer);

      buffer += chunk.toString();
      let boundary = buffer.lastIndexOf('\n');
      if (boundary === -1) {
        // 说明没有完整的换行符，全部属于阶段残余包，继续缓存
        return;
      }

      const completeData = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);

      const lines = completeData.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.includes('[DONE]')) {
          continue;
        }
        if (trimmed.startsWith('data:')) {
          try {
            const dataStr = trimmed.slice(5).trim();
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              fullReply += content;
              res.write(content);
            }
          } catch (e) {
            // chunk 截断由于有了缓冲，不应抛错。如有格式异常，静默忽略
          }
        }
      }
    });

    stream.on('end', async () => {
      clearTimeout(timeoutTimer);
      const finalDBReply = "我先记录下这些信息，正在深度为您分析中...\n\n" + fullReply;
      if (fullReply.trim()) {
        try {
          await query(
            `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
            [sessionId, 'agent', finalDBReply]
          );
        } catch (e) {
          console.error('[Chat Save Error]:', e);
        }
      }
      res.end();
    });

    stream.on('error', async (err) => {
      clearTimeout(timeoutTimer);
      console.error('[Chat Stream Event Error]:', err);
      await handleFallback(res, sessionId, "我先记录下这些信息，正在深度为您分析中...\n\n" + fullReply);
    });

  } catch (error) {
    console.error('Diagnosis chat API error:', error);
    try {
      if (!res.writableEnded) {
        await handleFallback(res, sessionId, "我先记录下这些信息，正在深度为您分析中...\n\n");
      }
    } catch (fallbackErr) {
      console.error('Failed to execute fallback:', fallbackErr);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}

// 统一超时与异常兜底回复函数
async function handleFallback(res, sessionId, currentAccumulated) {
  const fallbackReply = "我已安全地记录下了您所提供的信息，正在后台为您整理并提取企业画像。由于网络连接稍有迟缓，我可能暂时未能完全展开我的分析。您可以继续和我聊聊其他方面，或者稍候片刻在右侧查看画像的更新情况。";
  
  const responseText = currentAccumulated.includes(fallbackReply)
    ? currentAccumulated
    : `${currentAccumulated}\n\n[提示] ${fallbackReply}`;

  const remaining = responseText.slice(currentAccumulated.length);
  if (remaining) {
    res.write(remaining);
  }

  try {
    await query(
      `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
      [sessionId, 'agent', responseText]
    );
  } catch (e) {
    console.error('[Chat Persist Fallback Error]:', e);
  }
  res.end();
}
