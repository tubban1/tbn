import { extractStreamTextFromJson, streamText } from '../../../lib/text_model_provider';

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

  try {
    const stream = await streamText({
      systemPrompt: '你是一位资深AI产品架构师。',
      userPrompt: prompt,
      temperature: 0.7,
      timeout: 70000
    });

    // 设置响应头为事件流
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let buffer = '';
    stream.on('data', chunk => {
      buffer += chunk.toString();
      const boundary = buffer.lastIndexOf('\n');
      if (boundary === -1) return;

      const completeData = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);

      completeData.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.includes('[DONE]') || !trimmed.startsWith('data:')) return;
        try {
          const data = JSON.parse(trimmed.slice(5).trim());
          const content = extractStreamTextFromJson(data);
          if (content) res.write(content);
        } catch (e) {
          // 解析失败忽略
        }
      });
    });

    stream.on('end', () => {
      if (buffer.trim().startsWith('data:')) {
        try {
          const data = JSON.parse(buffer.trim().slice(5).trim());
          const content = extractStreamTextFromJson(data);
          if (content) res.write(content);
        } catch (e) {}
      }
      res.end();
    });

    stream.on('error', error => {
      console.error('AI生成流失败:', error);
      if (!res.writableEnded) res.end();
    });
  } catch (error) {
    console.error('AI生成请求失败:', error);
    res.status(500).end(`请求失败: ${error.message}`);
  }
}
