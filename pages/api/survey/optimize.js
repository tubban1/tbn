export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { industry, industryOther, functions, functionOther, workflow } = req.body || {};

  if (!Array.isArray(functions)) {
    return res.status(400).json({ error: '参数有误：functions必须是数组' });
  }

  const actualIndustry = industry === '其他' ? industryOther : industry;
  const actualFunctions = [...functions];
  if (actualFunctions.includes('其他')) {
    actualFunctions.splice(actualFunctions.indexOf('其他'), 1);
    if (functionOther) actualFunctions.push(functionOther);
  }

  const prompt = `
作为一位资深的产品经理和 AI 架构师，请帮用户梳理并优化他们的“智能体产品需求”。

用户提供的初步信息如下：
- 行业领域：${actualIndustry || '未提供'}
- 期望具备的核心功能：${actualFunctions.length > 0 ? actualFunctions.join(', ') : '未提供'}
- 初步的工作流或痛点描述：
${workflow || '未提供'}

请根据以上信息，帮用户重新梳理出一份更专业、更清晰、更结构化的智能体需求说明或工作流方案。
要求：
1. 语气要专业、有建设性。
2. 帮他们补全一些在他们行业中常见的 AI 智能体应用场景或边界情况。
3. 将杂乱的想法整理为清晰的步骤或模块。
4. 语言使用中文，直接输出梳理后的结果，不需要多余的寒暄。
`;

  const API_KEY = process.env.VECTORENGINE_GEMINI_KEY;
  const API_BASE = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
  const MODEL = process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';

  if (!API_KEY) {
    return res.status(500).json({ error: 'API配置错误: VECTORENGINE_GEMINI_KEY 未配置' });
  }

  try {
    const url = `${API_BASE}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是一位资深AI产品架构师。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: true // 开启流式输出
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API请求失败:', response.status, errorText);
      return res.status(500).json({ error: `API调用失败 (${response.status})` });
    }

    // 设置响应头为事件流
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              res.write(data.choices[0].delta.content);
            }
          } catch (e) {
            // 解析失败忽略
          }
        }
      }
    }
    
    res.end();
  } catch (error) {
    console.error('AI生成请求失败:', error);
    res.status(500).end(`请求失败: ${error.message}`);
  }
}
