import axios from 'axios';
import https from 'https';
import FormData from 'form-data';
import { query } from '../../../lib/db';
import {
  ensureCreditsTables,
  ensureDrawImagesTable,
  saveDrawImagePair,
  processAndUploadImageUrl,
  uploadToFreeimageHost,
  calculateCreditsForSize
} from '../../../lib/image-agent-helpers';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const { action } = req.query;

  // Only allow POST requests for all these endpoints
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    if (action === 'pre-check') {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: '账号和密码不能为空！' });
      }

      await ensureCreditsTables();

      const CREDITS_PER_IMAGE = 5;
      let currentCredits = 0;

      const userRows = await query('SELECT password, credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        if (userRows[0].password !== password) {
          return res.status(401).json({ success: false, error: '密码错误，请重试！' });
        }
        currentCredits = userRows[0].credits;
        if (currentCredits < CREDITS_PER_IMAGE) {
          return res.status(400).json({ success: false, error: 'Insufficient credits', credits: currentCredits });
        }
      } else {
        // New user: grant 30 free credits
        console.log(`[TImage Pre-check] Creating user with 30 free credits for ${email}`);
        await query('INSERT INTO user_credits (email, password, credits) VALUES (?, ?, 30)', [email, password]);
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
          [email, 'gift', 30, 30, 'New user welcome bonus']
        );
        currentCredits = 30;
      }

      const apiKey = process.env.VECTORENGINE_API_KEY;
      const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
      const model = process.env.IMAGE_MODEL || 'gpt-image-2';

      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'VECTORENGINE_API_KEY is not configured in .env' });
      }

      return res.json({
        success: true,
        apiKey,
        apiBase,
        model,
        credits: currentCredits
      });
    }

    else if (action === 'commit') {
      const { email, imageUrl, style = 'text', prompt, inputImageUrl = 'text-to-image' } = req.body;
      if (!email || !imageUrl) {
        return res.status(400).json({ success: false, error: 'Email and imageUrl are required' });
      }

      await ensureCreditsTables();

      const CREDITS_PER_IMAGE = 5;
      const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
      if (!userRows || userRows.length === 0 || userRows[0].credits < CREDITS_PER_IMAGE) {
        return res.status(400).json({ success: false, error: 'Insufficient credits' });
      }

      const currentCredits = userRows[0].credits;
      const finalCredits = currentCredits - CREDITS_PER_IMAGE;

      // 1. Deduct credits
      await query('UPDATE user_credits SET credits = ? WHERE email = ?', [finalCredits, email]);
      await query(
        'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
        [email, 'consume', -CREDITS_PER_IMAGE, finalCredits, style === 'edit' ? 'Image editing' : 'Image generation']
      );

      // 2. Save record to database
      console.log(`[TImage Commit] Saving generated record for email: ${email}`);
      const savedImage = await saveDrawImagePair(email, inputImageUrl, imageUrl, imageUrl, style, prompt);

      return res.json({
        success: true,
        drawImageId: savedImage?.id || null,
        credits: finalCredits
      });
    }

    else if (action === 'optimize-prompt') {
      const { userPrompt, categoryName, email } = req.body;
      if (!userPrompt) {
        return res.status(400).json({ success: false, error: 'userPrompt is required' });
      }

      const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
      const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
      const promptModel = process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';

      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'VECTORENGINE_GEMINI_KEY or VECTORENGINE_API_KEY is not configured in .env' });
      }

      await ensureCreditsTables();

      const CREDITS_PER_TEXT = 1;
      let currentCredits = 0;

      if (email) {
        const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
        if (userRows && userRows.length > 0) {
          const updateResult = await query('UPDATE user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?', [CREDITS_PER_TEXT, email, CREDITS_PER_TEXT]);
          if (updateResult.affectedRows === 0) {
            return res.status(400).json({ success: false, error: 'Insufficient credits for optimization', credits: userRows[0].credits });
          }
          currentCredits = userRows[0].credits - CREDITS_PER_TEXT;
          
          req.creditsPreDeducted = true;
          req.emailForRefund = email;
          req.creditsAmountToRefund = CREDITS_PER_TEXT;
        } else {
          await query('INSERT INTO user_credits (email, credits) VALUES (?, 29)', [email]);
          await query(
            'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
            [email, 'gift', 30, 30, 'New user welcome bonus']
          );
          currentCredits = 29;
          req.creditsPreDeducted = true;
          req.emailForRefund = email;
          req.creditsAmountToRefund = CREDITS_PER_TEXT;
        }
      }

      const systemPrompt = `你是一位精通GPT-Image 绘图的顶级旅游行业提示词工程大师。
你的任务是将用户输入的简单想法，根据具体的旅游物料类别（如海报、行程攻略、风光大片等），改写并生成 3 个不同风格的高清旅游绘图专业提示词。

每个生成的提示词应当符合以下要求：
1. **需求理解与意图适配（至关重要 ⚠️）**：
   - **当用户输入的想法较为简略/不明确时**：你应当发挥极致的创意与旅游美学造诣，主动为其补充和拓展画面细节（包括目的地标志物、应季风光、纵深构图、氛围光影），并自带意料之外的地域特色或人文情怀，给用户带来超预期的视觉惊喜。
   - **当用户输入的要求非常具体/明确时**：你必须 100% 严格遵循并精准锁定用户指定的全部核心细节（例如明确指定的景点、特定的色调、指定的文案字句、要求的画风等），绝不偏离或漏掉用户的指示。在严丝合缝满足用户明确要求的根基上，你仍然应当在细节中巧妙加入一些高端画质修饰标签（如：电影级逆光、微米级发丝质感、局部精致彩蛋等）作为增值惊喜，带给用户双重的震撼。
2. **排版设计与文案艺术（极具核心地位 ✨）**：如果物料类别包含“海报”、“行程”、“攻略”、“长图”等营销与路书排版属性，你必须在提示词中加入贴合主题的艺术排版、文案设计与版面规划！
   - **文化特色与地域文案惊喜**：
     请根据具体的目的地，**自动融合极富当地人文底蕴、方言特色或少数民族语言的文案作为画面彩蛋**！在英文生图指令中通过 \`reads "..."\` 标签精确刻画，让海报细节充满意料之外的文化震撼：
     * **西藏/藏区旅游**：可在文案中巧妙加入少量精美的藏文符号或音译（例如：\`reads "བཀྲ་ཤིས་བདེ་ལེགས། 扎西德勒"\`，代表吉祥如意）。
     * **川渝旅游**：可以融入极具市井温度与爽朗性格的方言艺术字（例如：\`reads "巴适得板"\` 或 \`reads "安逸川西"\`）。
     * **云南旅游**：可以包含如东巴文化色彩或民谣短语（例如：\`reads "风花雪月"\` 或 \`reads "漫步大理"\`）。
     * **泰国/东南亚旅游**：采用融合泰式风情的文字排版（例如：\`reads "สวัสดี Sa-wat-dee"\` 或 \`reads "Sawasdee Thailand"\`）。
     * **欧洲高奢目的地（如意大利/法国）**：融入充满欧洲古典浪漫与优雅衬线字体的本土名言（例如意大利的 \`reads "LA DOLCE VITA"\`，巴黎的 \`reads "C'est la vie"\` 或 \`reads "BON VOYAGE"\`）。
     * **无特定文化标签的通用情况**：默认使用中文汉字，如 \`reads "漫步时光"\`、\`reads "秘境探索"\` 等。
   - **排版排布**：加入 \`elegant poster layout\`, \`travel editorial design\`, \`bold stylish graphic layout\` 等排版标签，确保成图具备高档海报或精致电子路书的设计感，且字体渲染清晰美观。
   - “中文专业提示词(promptZh)”中也要包含对排版格局和多语言文案文化意境的精美表述。
3. 同时输出对应的“中文专业提示词(promptZh)”和“英文生图指令(prompt)”。“中文专业提示词”应当极具画面感与专业度。
4. 请以清晰的 JSON 数组格式直接返回，请确保仅返回 JSON，不需要其他解释文字，且格式如下：
[
  {
    "style": "风格名称（如：浪漫日落、复古水彩、无字纯景）",
    "promptZh": "精美、画面感极强的中文专业提示词",
    "prompt": "对应的、高度优化的英文生图指令"
  },
  ...
]`;

      const userMessage = `用户输入的简单想法是：'${userPrompt}'\n当前旅游物料类别是：'${categoryName || '旅游攻略图'}'`;

      console.log(`[TImage Optimize] Sending prompt optimization request to VectorEngine:`, {
        model: promptModel,
        userPrompt: userPrompt.substring(0, 50)
      });

      const response = await axios.post(
        `${apiBase}/chat/completions`,
        {
          model: promptModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.8
        },
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from AI model');
      }

      // Try parsing JSON out of model response (handle possible markdown code blocks)
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        // Remove opening ```json or ```
        cleanedContent = cleanedContent.replace(/^```[a-zA-Z]*\n/, '');
        // Remove closing ```
        cleanedContent = cleanedContent.replace(/\n```$/, '');
        cleanedContent = cleanedContent.trim();
      }

      let optimizedPrompts = [];
      try {
        optimizedPrompts = JSON.parse(cleanedContent);
      } catch (parseErr) {
        console.error('[TImage Optimize] Failed to parse JSON from AI model response. Content:', content);
        // Fallback if parsing failed: create a simple structure
        optimizedPrompts = [
          { style: 'AI 经典风格', promptZh: content, prompt: content }
        ];
      }

      if (email) {
        try {
          await query(
            'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT credits FROM user_credits WHERE email = ?), ?)',
            [email, 'consume', -CREDITS_PER_TEXT, email, 'Prompt optimization']
          );
        } catch (dbErr) {
          console.error('[TImage Optimize] Failed to save transaction log:', dbErr.message);
        }
      }

      return res.json({
        success: true,
        optimizedPrompts
      });
    }

    else if (action === 'generate') {
      const { prompt, prompt_en, prompt_zh, description, size, quality, format = 'jpeg', email } = req.body;

      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      await ensureCreditsTables();

      const CREDITS_PER_IMAGE = calculateCreditsForSize(size);
      let currentCredits = 0;

      if (email) {
        const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
        if (userRows && userRows.length > 0) {
          // Pre-deduct atomically
          const updateResult = await query('UPDATE user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?', [CREDITS_PER_IMAGE, email, CREDITS_PER_IMAGE]);
          if (updateResult.affectedRows === 0) {
            return res.status(400).json({ success: false, error: 'Insufficient credits', credits: userRows[0].credits });
          }
          currentCredits = userRows[0].credits - CREDITS_PER_IMAGE;
          
          // Mark for refund in case of error
          req.creditsPreDeducted = true;
          req.emailForRefund = email;
          req.creditsAmountToRefund = CREDITS_PER_IMAGE;
        } else {
          // New user: grant 30 free credits, pre-deduct 5 = 25
          console.log(`[TImage] Creating user with 30 free credits for ${email}`);
          await query('INSERT INTO user_credits (email, credits) VALUES (?, 25)', [email]);
          await query(
            'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
            [email, 'gift', 30, 30, 'New user welcome bonus']
          );
          currentCredits = 25;

          // Mark for refund in case of error
          req.creditsPreDeducted = true;
          req.emailForRefund = email;
          req.creditsAmountToRefund = CREDITS_PER_IMAGE;
        }
      }

      const apiKey = process.env.VECTORENGINE_API_KEY;
      const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
      const model = process.env.IMAGE_MODEL || 'gpt-image-2';

      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'VECTORENGINE_API_KEY is not configured in .env' });
      }

      console.log('[TImage] Initiating image generation request to VectorEngine:', {
        model,
        size: size || 'omitted',
        quality: quality || 'omitted',
        format,
        promptSubstring: prompt.substring(0, 50)
      });

      const requestPayload = {
        model,
        prompt,
        n: 1,
        format
      };

      if (size) requestPayload.size = size;
      if (quality) requestPayload.quality = quality;

      const response = await axios.post(
        `${apiBase}/images/generations`,
        requestPayload,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 400000, // 400s timeout
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }
      );

      console.log('[TImage] VectorEngine response status:', response.status);

      const dataList = response.data?.data;
      if (!dataList || dataList.length === 0) {
        throw new Error('No image data returned from VectorEngine');
      }

      const firstImage = dataList[0];
      let originalUrl = firstImage.url;
      let b64Json = firstImage.b64_json;
      let freeimageUrl = '';

      if (b64Json) {
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        freeimageUrl = `data:${mimeType};base64,${b64Json}`;
        originalUrl = freeimageUrl;
      } else if (originalUrl) {
        freeimageUrl = originalUrl;
      } else {
        throw new Error('Invalid image format returned from VectorEngine');
      }

      // Synchronously upload to Freeimage.host to ensure the URL is generated and saved correctly
      let permanentOutputUrl = freeimageUrl;
      let permanentDisplayUrl = freeimageUrl;

      try {
        console.log(`[TImage] Starting synchronous Freeimage upload...`);
        if (freeimageUrl.startsWith('data:')) {
          const parts = freeimageUrl.split(';base64,');
          const mimeType = parts[0].split(':')[1] || 'image/png';
          const b64Data = parts[1];
          const filename = `generated_${Date.now()}.png`;
          const uploadResult = await uploadToFreeimageHost(b64Data, filename, mimeType);
          permanentOutputUrl = uploadResult.url;
          permanentDisplayUrl = uploadResult.displayUrl;
        } else if (freeimageUrl.startsWith('http')) {
          const filename = `generated_${Date.now()}.png`;
          const uploadResult = await processAndUploadImageUrl(freeimageUrl, filename);
          permanentOutputUrl = uploadResult.url;
          permanentDisplayUrl = uploadResult.displayUrl;
        }
        console.log(`[TImage] Synchronous Freeimage upload complete. URL: ${permanentOutputUrl}`);
      } catch (uploadErr) {
        console.error('[TImage] Synchronous upload failed, falling back to original URL:', uploadErr.message);
        if (uploadErr.base64Fallback) {
          permanentOutputUrl = uploadErr.base64Fallback;
          permanentDisplayUrl = uploadErr.base64Fallback;
        }
      }

      let dbOutputUrl = permanentOutputUrl;
      let dbDisplayUrl = permanentDisplayUrl;

      if (dbOutputUrl.startsWith('data:') && dbOutputUrl.length > 500) {
        dbOutputUrl = 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Saved+Locally';
        dbDisplayUrl = 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Saved+Locally';
      }

      let finalCredits = currentCredits;
      let drawImageId = null;
      if (email) {
        try {
          await query(
            'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT credits FROM user_credits WHERE email = ?), ?)',
            [email, 'consume', -CREDITS_PER_IMAGE, email, 'Image generation']
          );
          console.log(`[TImage] Transaction logged for 5 credits generation. Remaining roughly: ${finalCredits}`);

          console.log(`[TImage] Saving generated image record to DB for email: ${email}`);
          const actualPromptEn = prompt_en || prompt;
          const actualPromptZh = prompt_zh || prompt;
          const savedImage = await saveDrawImagePair(
            email, 
            'text-to-image', 
            dbOutputUrl, 
            dbDisplayUrl, 
            'text', 
            prompt, // Main prompt (Chinese)
            actualPromptEn, // English prompt
            actualPromptZh, // Chinese prompt
            description || null
          );
          drawImageId = savedImage?.id || null;
        } catch (dbErr) {
          console.error('[TImage] Failed to update credits/save generation record to DB:', dbErr.message);
        }
      }

      return res.json({
        success: true,
        originalUrl: permanentOutputUrl,
        freeimageUrl: permanentDisplayUrl,
        drawImageId,
        model,
        size,
        prompt,
        credits: finalCredits
      });
    }



    else if (action === 'history') {
      const { email, limit = 15, offset = 0 } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      await ensureDrawImagesTable();

      const countRows = await query('SELECT COUNT(*) as total FROM draw_images WHERE email = ?', [email]);
      const total = countRows[0]?.total || 0;

      const rows = await query(
        `SELECT * FROM draw_images WHERE email = ? ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        [email]
      );

      return res.json({
        success: true,
        images: rows || [],
        total
      });
    }

    else {
      return res.status(404).json({ success: false, error: 'Action Not Found' });
    }
  } catch (error) {
    if (req.creditsPreDeducted && req.emailForRefund && req.creditsAmountToRefund) {
      console.log(`[TImage API] Refunding ${req.creditsAmountToRefund} credits to ${req.emailForRefund} due to error`);
      try {
        await query('UPDATE user_credits SET credits = credits + ? WHERE email = ?', [req.creditsAmountToRefund, req.emailForRefund]);
      } catch (refundErr) {
        console.error('[TImage API] Failed to refund credits:', refundErr.message);
      }
    }

    console.error(`[TImage API] Error handling ${action}:`, error.message);
    if (error.response) {
      console.error('[TImage API] API error payload:', error.response.data);
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.error?.message || error.message || 'API request failed'
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
}
