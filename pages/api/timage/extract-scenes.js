import axios from 'axios';
import https from 'https';
import { query } from '../../../lib/db';
import { ensureCreditsTables } from '../../../lib/image-agent-helpers';
import { generateText } from '../../../lib/text_model_provider';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function extractJsonArray(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return '';
  let cleanedContent = rawContent.trim();

  if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```[a-zA-Z]*\n/, '');
    cleanedContent = cleanedContent.replace(/\n```$/, '');
    cleanedContent = cleanedContent.trim();
  }

  if (cleanedContent.startsWith('[')) return cleanedContent;

  const start = cleanedContent.indexOf('[');
  const end = cleanedContent.lastIndexOf(']');
  if (start >= 0 && end > start) {
    return cleanedContent.slice(start, end + 1).trim();
  }

  return cleanedContent;
}

function normalizeTextForScenes(rawText) {
  return (rawText || '')
    .replace(/<DocumentContent>|<\/DocumentContent>/g, '')
    .replace(/Please analyze[\s\S]*?extract scenes:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFallbackScenes(rawText, targetSceneCount, unifiedStyle) {
  const normalizedText = normalizeTextForScenes(rawText);
  if (!normalizedText || normalizedText.length < 8) return [];

  const chunks = normalizedText
    .split(/(?<=[。！？!?；;])\s*|\n+/)
    .map(item => item.trim())
    .filter(item => item.length > 4);

  const sourceChunks = chunks.length ? chunks : [normalizedText];
  const scenes = [];
  const styleText = unifiedStyle ? `，统一风格：${unifiedStyle}` : '';

  for (let i = 0; i < targetSceneCount; i++) {
    const start = Math.floor((i * sourceChunks.length) / targetSceneCount);
    const end = Math.max(start + 1, Math.floor(((i + 1) * sourceChunks.length) / targetSceneCount));
    const sceneText = sourceChunks.slice(start, end).join(' ').slice(0, 220);
    const description = sceneText || normalizedText.slice(0, 120);

    scenes.push({
      description: description.length > 90 ? `${description.slice(0, 90)}...` : description,
      prompt: `根据以下内容生成第 ${i + 1} 幕画面：${description}${styleText}。画面主体明确，构图完整，细节丰富，电影感光影，高质量商业视觉，适合图像生成。`
    });
  }

  return scenes;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { text, unifiedStyle, sceneCount = 6, image, email, password, documentBase64, documentMimeType } = req.body;
  const targetSceneCount = Math.min(20, Math.max(2, parseInt(sceneCount) || 6));

  if ((!text || typeof text !== 'string') && !documentBase64) {
    return res.status(400).json({ success: false, error: 'Text content or document is required' });
  }

  try {
    await ensureCreditsTables();

    const CREDITS_PER_TEXT = 1;

    if (email) {
      if (!password) {
        return res.status(401).json({ success: false, error: '登录状态已过期，请重新输入邮箱和密码。' });
      }

      const userRows = await query('SELECT password, credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        if (userRows[0].password !== password) {
          return res.status(401).json({ success: false, error: '账号密码不匹配，请重新登录。' });
        }

        const updateResult = await query('UPDATE user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?', [CREDITS_PER_TEXT, email, CREDITS_PER_TEXT]);
        if (updateResult.affectedRows === 0) {
          return res.status(400).json({ success: false, error: 'Insufficient credits for extracting scenes' });
        }
        
        req.creditsPreDeducted = true;
        req.emailForRefund = email;
        req.creditsAmountToRefund = CREDITS_PER_TEXT;
      } else {
        await query('INSERT INTO user_credits (email, password, credits) VALUES (?, ?, 29)', [email, password]);
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
          [email, 'gift', 30, 30, 'New user welcome bonus']
        );
        req.creditsPreDeducted = true;
        req.emailForRefund = email;
        req.creditsAmountToRefund = CREDITS_PER_TEXT;
      }
    }

    const styleInstruction = unifiedStyle
      ? `\nCRITICAL STYLE REQUIREMENT: You MUST enforce the art style "${unifiedStyle}" in EVERY single prompt you generate. Ignore any conflicting style references in the text.`
      : '';

    const systemPrompt = `You are an expert Storyboard Director and Prompt Engineer.
Your task is to analyze the user's provided long text, story, or article, and split it into EXACTLY ${targetSceneCount} logical visual scenes. You MUST generate exactly ${targetSceneCount} scenes, no more, no less.
For each scene, extract the core action/visual and write a highly detailed, professional Chinese image generation prompt.${styleInstruction}
${image ? "IMPORTANT: The user has provided a base image. You MUST analyze this base image. Ensure that your extracted scene prompts are highly relevant and visually consistent with the main subjects, composition, or elements found in this base image. The prompts should describe scenes that can naturally be derived or modified from this base image.\n" : ""}IMPORTANT: Our image model is highly capable of rendering typography. If the user's text requests words, captions, or typography to be included IN the image, you MUST specify exactly what text to write in the prompt (e.g. 'with the text "Hello" written on it'). Do NOT append "no text" to the prompt if the user asks for text!
Also provide a short Chinese description of what the scene is about.

Return the response STRICTLY as a JSON array of objects. Do not include markdown code blocks around the JSON.
Format:
[
  {
    "description": "Scene description in Chinese",
    "prompt": "highly detailed prompt in Chinese for image generation, cinematic lighting, 8k..."
  }
]`;

    const userMessageContent = [];
    let instructions = 'Please analyze the following text and extract scenes:\n\n';
    if (image) {
      instructions = 'Please analyze the following text and the provided base image, then extract scenes:\n\n';
      userMessageContent.push({ type: 'image_url', image_url: { url: image } });
    }
    if (documentBase64) {
      if (documentMimeType && documentMimeType.includes('wordprocessingml.document')) {
        try {
          const mammoth = require('mammoth');
          const buffer = Buffer.from(documentBase64, 'base64');
          const result = await mammoth.extractRawText({ buffer });
          instructions = 'Please analyze the following document content ' + (text ? 'along with the user text ' : '') + 'then extract scenes:\n\n';
          userMessageContent.push({ type: 'text', text: `<DocumentContent>\n${result.value}\n</DocumentContent>\n` });
        } catch (err) {
          console.error('[Extract Scenes] Failed to parse DOCX:', err);
          return res.status(400).json({ success: false, error: 'Failed to read the Word document format. Please copy-paste the text instead.' });
        }
      } else {
        instructions = 'Please analyze the attached document ' + (text ? 'and the following text ' : '') + 'then extract scenes:\n\n';
        userMessageContent.push({
          type: 'image_url', // Most OpenAI adapters for Gemini map image_url with PDF mime to inline_data
          image_url: { url: `data:${documentMimeType || 'application/pdf'};base64,${documentBase64}` }
        });
      }
    }
    if (text) {
      userMessageContent.push({ type: 'text', text: instructions + text });
    } else {
      userMessageContent.push({ type: 'text', text: instructions });
    }

    console.log(`[Extract Scenes] Sending request to text model provider:`, {
      textLength: text ? text.length : 0,
      hasImage: !!image,
      hasDocument: !!documentBase64
    });

    let content = '';
    let scenes = [];
    const fallbackTextSource = userMessageContent
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n\n');
    const canUseTextProvider = userMessageContent.every(part => part.type === 'text');
    try {
      if (canUseTextProvider) {
        content = await generateText({
          systemPrompt,
          userPrompt: fallbackTextSource,
          temperature: 0.7,
          timeout: 8000
        });
      } else {
        const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
        const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
        const promptModel = process.env.PROMPT_MODEL || 'gpt-4o-mini';
        if (!apiKey) {
          throw new Error('VECTORENGINE_GEMINI_KEY or VECTORENGINE_API_KEY is not configured for multimodal scene extraction');
        }
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
            timeout: 8000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
          }
        );
        content = response.data?.choices?.[0]?.message?.content || '';
      }

      if (!content) {
        throw new Error('No content returned from AI model');
      }

      const cleanedContent = extractJsonArray(content);
      scenes = JSON.parse(cleanedContent);
    } catch (aiErr) {
      console.warn('[Extract Scenes] AI extraction failed, using fallback scenes:', aiErr.message);
      scenes = buildFallbackScenes(fallbackTextSource, targetSceneCount, unifiedStyle);
      if (!scenes.length) {
        const extractError = new Error('分镜解析失败：模型暂时不可用，请缩短文案或稍后重试。');
        extractError.statusCode = 503;
        throw extractError;
      }
    }

    // Limit to user defined exact scenes if AI generates too many
    if (scenes.length > targetSceneCount) {
      scenes = scenes.slice(0, targetSceneCount);
    }

    if (email) {
      try {
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT credits FROM user_credits WHERE email = ?), ?)',
          [email, 'consume', -CREDITS_PER_TEXT, email, 'Extract scenes']
        );
      } catch (dbErr) {
        console.error('[Extract Scenes] Failed to save transaction log:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      scenes
    });
  } catch (error) {
    if (req.creditsPreDeducted && req.emailForRefund && req.creditsAmountToRefund) {
      console.log(`[Extract Scenes] Refunding ${req.creditsAmountToRefund} credits to ${req.emailForRefund} due to error`);
      try {
        await query('UPDATE user_credits SET credits = credits + ? WHERE email = ?', [req.creditsAmountToRefund, req.emailForRefund]);
      } catch (refundErr) {
        console.error('[Extract Scenes] Failed to refund credits:', refundErr.message);
      }
    }

    console.error('[Extract Scenes] Error:', error.message);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    if (error.response) {
      console.error('[Extract Scenes] API Error Payload:', error.response.data);
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.error?.message || 'Failed to extract scenes'
      });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
