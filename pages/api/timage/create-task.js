import crypto from 'crypto';
import axios from 'axios';
import { query } from '../../../lib/db';
import { calculateCreditsForSize, ensureCreditsTables } from '../../../lib/image-agent-helpers';
import { ensureImageTaskSchema } from '../../../lib/image_task_schema';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    prompt,
    prompt_en,
    prompt_zh,
    description,
    size,
    quality,
    format = 'jpeg',
    email,
    password
  } = req.body || {};

  if (!email || !password) {
    return res.status(401).json({ success: false, error: '登录状态已过期，请重新输入邮箱和密码。' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  try {
    await ensureCreditsTables();
    await ensureImageTaskSchema();

    const creditsCost = calculateCreditsForSize(size);
    let currentCredits = 0;

    const userRows = await query('SELECT password, credits FROM user_credits WHERE email = ?', [email]);
    if (userRows && userRows.length > 0) {
      if (userRows[0].password !== password) {
        return res.status(401).json({ success: false, error: '账号密码不匹配，请重新登录。' });
      }

      const updateResult = await query(
        'UPDATE user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?',
        [creditsCost, email, creditsCost]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credits',
          credits: userRows[0].credits
        });
      }
      currentCredits = Number(userRows[0].credits || 0) - creditsCost;
    } else {
      const welcomeCredits = 30;
      if (welcomeCredits < creditsCost) {
        return res.status(400).json({ success: false, error: 'Insufficient credits', credits: 0 });
      }
      currentCredits = welcomeCredits - creditsCost;
      await query('INSERT INTO user_credits (email, password, credits) VALUES (?, ?, ?)', [email, password, currentCredits]);
      await query(
        'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
        [email, 'gift', welcomeCredits, welcomeCredits, 'New user welcome bonus']
      );
    }

    const taskId = `img_${crypto.randomBytes(16).toString('hex')}`;
    const requestPayload = {
      prompt,
      prompt_en: prompt_en || prompt,
      prompt_zh: prompt_zh || prompt,
      description: description || null,
      size: size || null,
      quality: quality || null,
      format
    };

    await query(
      `INSERT INTO image_generation_tasks
        (id, email, task_type, status, request_payload, credits_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [taskId, email, 'text-to-image', 'pending', JSON.stringify(requestPayload), creditsCost]
    );

    const wakeUrl = process.env.IMAGE_WORKER_WAKE_URL || process.env.RENDER_WORKER_URL;
    if (wakeUrl) {
      axios.get(wakeUrl, { timeout: 2000 }).catch((wakeError) => {
        console.warn('[TImage Create Task] Worker wake ping failed:', wakeError.message);
      });
    }

    return res.json({
      success: true,
      taskId,
      status: 'pending',
      credits: currentCredits,
      creditsCost
    });
  } catch (error) {
    console.error('[TImage Create Task] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create image generation task'
    });
  }
}
