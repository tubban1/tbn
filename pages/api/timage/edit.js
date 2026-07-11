import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';
import { query } from '../../../lib/db';
import { 
  ensureCreditsTables, 
  calculateCreditsForSize
} from '../../../lib/image-agent-helpers';
import { ensureImageTaskSchema } from '../../../lib/image_task_schema';

export const config = {
  api: {
    bodyParser: false, // Disabling body parser to allow multer to parse multipart form data
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
  }
});

// Helper to run middleware in Next.js API Routes
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // Run the multer middleware to handle up to 6 files named 'image'
    await runMiddleware(req, res, upload.array('image', 6));

    const files = req.files;
    const { prompt, prompt_en, prompt_zh, description, size, n = '1', email, password } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one image file is required' });
    }

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    await ensureCreditsTables();
    await ensureImageTaskSchema();

    const CREDITS_PER_IMAGE = calculateCreditsForSize(size);
    let currentCredits = 0;

    if (email) {
      if (!password) {
        return res.status(401).json({ success: false, error: '登录状态已过期，请重新输入邮箱和密码。' });
      }

      const userRows = await query('SELECT password, credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        if (userRows[0].password !== password) {
          return res.status(401).json({ success: false, error: '账号密码不匹配，请重新登录。' });
        }

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
        await query('INSERT INTO user_credits (email, password, credits) VALUES (?, ?, 25)', [email, password]);
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

    const taskId = `edit_${crypto.randomBytes(16).toString('hex')}`;
    const requestPayload = {
      prompt,
      prompt_en: prompt_en || prompt,
      prompt_zh: prompt_zh || prompt,
      description: description || null,
      size: size || null,
      n,
      images: files.map((file, index) => ({
        base64: file.buffer.toString('base64'),
        filename: file.originalname || `image_${index}.png`,
        mimeType: file.mimetype || 'image/png'
      }))
    };

    await query(
      `INSERT INTO image_generation_tasks
        (id, email, task_type, status, request_payload, credits_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [taskId, email, 'image-edit', 'pending', JSON.stringify(requestPayload), CREDITS_PER_IMAGE]
    );

    req.creditsPreDeducted = false;

    const wakeUrl = process.env.IMAGE_WORKER_WAKE_URL || process.env.RENDER_WORKER_URL;
    if (wakeUrl) {
      axios.get(wakeUrl, { timeout: 2000 }).catch((wakeError) => {
        console.warn('[TImage Edit] Worker wake ping failed:', wakeError.message);
      });
    }

    return res.json({
      success: true,
      taskId,
      status: 'pending',
      size,
      prompt,
      credits: currentCredits
    });

  } catch (error) {
    if (req.creditsPreDeducted && req.emailForRefund && req.creditsAmountToRefund) {
      console.log(`[TImage Edit] Refunding ${req.creditsAmountToRefund} credits to ${req.emailForRefund} due to error`);
      try {
        await query('UPDATE user_credits SET credits = credits + ? WHERE email = ?', [req.creditsAmountToRefund, req.emailForRefund]);
      } catch (refundErr) {
        console.error('[TImage Edit] Failed to refund credits:', refundErr.message);
      }
    }

    console.error('[TImage Edit] Error editing image:', error?.message);
    if (error.response) {
      console.error('[TImage Edit] VectorEngine error payload:', error.response.data);
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.error?.message || error.message || 'VectorEngine image edit failed'
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during image editing'
    });
  }
}
