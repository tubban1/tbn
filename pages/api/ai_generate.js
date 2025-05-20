// AI生成接口 - 代理调用AI API以保护API密钥
export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { query } = req.body;
  
  // 验证请求参数
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: '请提供有效的查询内容' });
  }

  // 从环境变量中读取API密钥
  const API_KEY = process.env.API_SECRET;
  
  // 验证API密钥是否存在
  if (!API_KEY) {
    console.error('API密钥未配置');
    return res.status(500).json({ error: 'API配置错误' });
  }
  
  const url = 'https://cloud.infini-ai.com/maas/v1/chat/completions';

  try {
    // 调用AI API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen3-8b',
        messages: [{ role: 'user', content: query }]
      })
    });

    // 检查响应状态
    if (!response.ok) {
      let errorDetails = `HTTP 错误! 状态码: ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetails += ` - ${JSON.stringify(errorJson)}`;
      } catch (e) {
        const errorText = await response.text();
        errorDetails += ` - ${errorText}`;
      }
      throw new Error(errorDetails);
    }

    // 解析响应数据
    const data = await response.json();
    
    // 返回AI回复
    res.status(200).json(data);
  } catch (error) {
    console.error('AI生成请求失败:', error);
    res.status(500).json({ error: `请求失败: ${error.message}` });
  }
}