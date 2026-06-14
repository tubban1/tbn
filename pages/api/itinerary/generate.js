import axios from 'axios';
import https from 'https';
import { query } from '../../../lib/db';
import { ensureCreditsTables } from '../../../lib/image-agent-helpers';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    destination,
    days,
    people,
    budget,
    startDate,
    pace,
    travelType,
    transport,
    interests,
    email
  } = req.body;

  if (!destination || !days) {
    return res.status(400).json({ success: false, error: 'Destination and days are required' });
  }

  try {
    const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
    const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
    const promptModel = process.env.PROMPT_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'API key is not configured' });
    }

    await ensureCreditsTables();

    // Optionally handle credits (deduct 1 credit for an itinerary)
    const CREDITS_PER_ITINERARY = 1;
    if (email) {
      const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        const updateResult = await query('UPDATE user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?', [CREDITS_PER_ITINERARY, email, CREDITS_PER_ITINERARY]);
        if (updateResult.affectedRows === 0) {
          return res.status(400).json({ success: false, error: 'Insufficient credits for generating itinerary' });
        }
        
        req.creditsPreDeducted = true;
        req.emailForRefund = email;
        req.creditsAmountToRefund = CREDITS_PER_ITINERARY;
      }
    }

    const systemPrompt = `你是一个专业的旅行规划师。
请根据用户的需求，生成一份结构化的高品质旅行行程。
输出要求：
1. 只返回可解析的JSON，不要返回Markdown代码块（不要有 \`\`\`json 等修饰符）。
2. 行程需要按天拆分，每天至少包含上午、下午、晚上三个时间段。
3. 每天必须包含一个适合AI生图的 imagePrompt（画面生动、富有表现力，适合作为当天的封面）。
4. 输出内容使用中文。
5. 行程安排要符合用户的天数、节奏和预算。
6. 不要编造具体价格、航班号、酒店库存等实时信息。

你必须返回如下JSON结构：
{
  "title": "...",
  "summary": "...",
  "days": [
    {
      "day": 1,
      "theme": "...",
      "items": [
        {
          "time": "...",
          "activity": "...",
          "description": "...",
          "transport": "...",
          "tips": "..."
        }
      ]
    }
  ],
  "imagePrompts": [
    {
      "day": 1,
      "title": "...",
      "prompt": "..."
    }
  ],
  "tips": [
    "..."
  ]
}`;

    const userMessageContent = `请为我规划一次旅行：
目的地：${destination}
天数：${days}天
人数：${people || '未提供'}
预算：${budget || '未提供'}
出发日期：${startDate || '未提供'}
行程节奏：${pace || '未提供'}
旅行类型：${travelType || '未提供'}
交通方式：${transport || '未提供'}
补充兴趣点：${interests || '无'}
`;

    const response = await axios.post(
      `${apiBase}/chat/completions`,
      {
        model: promptModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from AI model');
    }

    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('\`\`\`')) {
      cleanedContent = cleanedContent.replace(/^\`\`\`[a-zA-Z]*\n/, '');
      cleanedContent = cleanedContent.replace(/\n\`\`\`$/, '');
      cleanedContent = cleanedContent.trim();
    }

    let itinerary = null;
    try {
      itinerary = JSON.parse(cleanedContent);
    } catch (parseErr) {
      console.error('[Generate Itinerary] Failed to parse JSON. Content:', content);
      throw new Error('AI returned invalid format. Please try again.');
    }

    if (email) {
      try {
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT credits FROM user_credits WHERE email = ?), ?)',
          [email, 'consume', -CREDITS_PER_ITINERARY, email, 'Generate itinerary']
        );
      } catch (dbErr) {
        console.error('[Generate Itinerary] Failed to save transaction log:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      itinerary
    });
  } catch (error) {
    if (req.creditsPreDeducted && req.emailForRefund && req.creditsAmountToRefund) {
      try {
        await query('UPDATE user_credits SET credits = credits + ? WHERE email = ?', [req.creditsAmountToRefund, req.emailForRefund]);
      } catch (refundErr) {
        console.error('[Generate Itinerary] Failed to refund credits:', refundErr.message);
      }
    }

    console.error('[Generate Itinerary] Error:', error.message);
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.error?.message || 'Failed to generate itinerary'
      });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
