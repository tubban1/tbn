import axios from 'axios';
import { query } from '../../../lib/db';
import { 
  ensureCreditsTables, 
  ensureDrawImagesTable,
  saveDrawImagePair, 
  processAndUploadImageUrl, 
  uploadToFreeimageHost 
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
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      await ensureCreditsTables();

      const CREDITS_PER_IMAGE = 5;
      let currentCredits = 0;

      const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        currentCredits = userRows[0].credits;
        if (currentCredits < CREDITS_PER_IMAGE) {
          return res.status(400).json({ success: false, error: 'Insufficient credits', credits: currentCredits });
        }
      } else {
        // New user: grant 30 free credits
        console.log(`[TImage Pre-check] Creating user with 30 free credits for ${email}`);
        await query('INSERT INTO user_credits (email, credits) VALUES (?, 30)', [email]);
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
      const { userPrompt, categoryName } = req.body;
      if (!userPrompt) {
        return res.status(400).json({ success: false, error: 'userPrompt is required' });
      }

      const apiKey = process.env.VECTORENGINE_API_KEY;
      const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
      const promptModel = process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';

      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'VECTORENGINE_API_KEY is not configured in .env' });
      }

      const systemPrompt = `你是一位精通 Stable Diffusion / Midjourney 和 GPT-Image 绘图的顶级旅游行业提示词工程大师。
你的任务是将用户输入的简单想法，改写并生成 3 个不同风格的高清旅游绘图专业提示词。
每个生成的提示词应当符合以下要求：
1. 包含丰富的细节描写：目的地风光、光影效果（如 黄金时刻、丁达尔光、电影感照明）、画面氛围（如 浪漫、高奢、唯美空灵）、画质与镜头视角标签。
2. 同时输出对应的“中文专业提示词(promptZh)”和“英文生图指令(prompt)”。“中文专业提示词”应当极具画面感与专业度。
3. 请以清晰的 JSON 数组格式直接返回，请确保仅返回 JSON，不需要其他解释文字，且格式如下：
[
  {
    "style": "风格名称（如：浪漫日落、复古水彩、现代航拍）",
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
          timeout: 60000
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

      return res.json({
        success: true,
        optimizedPrompts
      });
    }

    else if (action === 'generate') {
      const { prompt, size, quality, format = 'jpeg', email } = req.body;

      if (!prompt) {
        return res.status(400).json({ success: false, error: 'prompt is required' });
      }

      await ensureCreditsTables();

      const CREDITS_PER_IMAGE = 5;
      let currentCredits = 0;

      if (email) {
        const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
        if (userRows && userRows.length > 0) {
          currentCredits = userRows[0].credits;
          if (currentCredits < CREDITS_PER_IMAGE) {
            return res.status(400).json({ success: false, error: 'Insufficient credits', credits: currentCredits });
          }
        } else {
          // New user: grant 30 free credits
          console.log(`[TImage] Creating user with 30 free credits for ${email}`);
          await query('INSERT INTO user_credits (email, credits) VALUES (?, 30)', [email]);
          await query(
            'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
            [email, 'gift', 30, 30, 'New user welcome bonus']
          );
          currentCredits = 30;
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
          timeout: 300000 // 300s timeout
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

      // Synchronously upload generated image to Freeimage.host on the server
      let permanentOutputUrl = freeimageUrl;
      let permanentDisplayUrl = freeimageUrl;
      try {
        console.log(`[TImage] Uploading generated image to Freeimage.host synchronously`);
        const filename = `generated_${Date.now()}.png`;
        if (freeimageUrl.startsWith('data:')) {
          const parts = freeimageUrl.split(';base64,');
          const mimeType = parts[0].split(':')[1];
          const b64Data = parts[1];
          const uploadResult = await uploadToFreeimageHost(b64Data, filename, mimeType);
          permanentOutputUrl = uploadResult.url;
          permanentDisplayUrl = uploadResult.displayUrl;
        } else if (freeimageUrl.startsWith('http')) {
          const uploadResult = await processAndUploadImageUrl(freeimageUrl, filename);
          permanentOutputUrl = uploadResult.url;
          permanentDisplayUrl = uploadResult.displayUrl;
        }
        console.log(`[TImage] Synchronous upload success: displayUrl = ${permanentDisplayUrl}`);
      } catch (uploadErr) {
        console.error('[TImage] Failed to upload to Freeimage.host, falling back to original URL:', uploadErr.message);
      }

      let finalCredits = currentCredits;
      let drawImageId = null;
      if (email) {
        try {
          finalCredits = currentCredits - CREDITS_PER_IMAGE;
          await query('UPDATE user_credits SET credits = ? WHERE email = ?', [finalCredits, email]);
          await query(
            'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
            [email, 'consume', -CREDITS_PER_IMAGE, finalCredits, 'Image generation']
          );
          console.log(`[TImage] Deducted 5 credits for image generation. Remaining: ${finalCredits}`);

          console.log(`[TImage] Saving generated image record to DB for email: ${email}`);
          const savedImage = await saveDrawImagePair(email, 'text-to-image', permanentOutputUrl, permanentDisplayUrl, 'text', prompt);
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

    else if (action === 'persist') {
      const { drawImageId, imageUrl, inputImageUrl } = req.body;
      if (!drawImageId) {
        return res.status(400).json({ success: false, error: 'drawImageId is required' });
      }

      console.log(`[TImage Persist] Starting background persist for ID: ${drawImageId}`);

      // 1. Upload generated output image
      let permanentOutputUrl = imageUrl;
      let permanentDisplayUrl = imageUrl;

      if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:'))) {
        const filename = `generated_${Date.now()}.png`;
        if (imageUrl.startsWith('data:')) {
          const parts = imageUrl.split(';base64,');
          const mimeType = parts[0].split(':')[1];
          const b64Data = parts[1];
          const uploadResult = await uploadToFreeimageHost(b64Data, filename, mimeType);
          permanentOutputUrl = uploadResult.url;
          permanentDisplayUrl = uploadResult.displayUrl;
        } else {
          const uploadResult = await processAndUploadImageUrl(imageUrl, filename);
          permanentOutputUrl = uploadResult.url;
          permanentDisplayUrl = uploadResult.displayUrl;
        }
      }

      // 2. Upload input image if present
      let permanentInputUrl = inputImageUrl;
      let permanentInputDisplayUrl = inputImageUrl;

      if (inputImageUrl && inputImageUrl.startsWith('data:')) {
        const parts = inputImageUrl.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const b64Data = parts[1];
        const filename = `input_${Date.now()}.png`;
        const uploadResult = await uploadToFreeimageHost(b64Data, filename, mimeType);
        permanentInputUrl = uploadResult.url;
        permanentInputDisplayUrl = uploadResult.displayUrl;
      }

      // 3. Update database record
      if (permanentInputUrl) {
        await query(
          'UPDATE draw_images SET sketch_url = ?, generated_url = ?, display_url = ? WHERE id = ?',
          [permanentInputUrl, permanentOutputUrl, permanentDisplayUrl, drawImageId]
        );
      } else {
        await query(
          'UPDATE draw_images SET generated_url = ?, display_url = ? WHERE id = ?',
          [permanentOutputUrl, permanentDisplayUrl, drawImageId]
        );
      }

      console.log(`[TImage Persist] Successfully persisted ID: ${drawImageId} -> Output: ${permanentOutputUrl}, Display: ${permanentDisplayUrl}`);
      return res.json({ success: true, freeimageUrl: permanentDisplayUrl, originalUrl: permanentOutputUrl });
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
