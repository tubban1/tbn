import axios from 'axios';
import https from 'https';
import { query } from '../../../lib/db';
import { ensureCreditsTables } from '../../../lib/image-agent-helpers';
import { verifyPassword } from '../../../lib/tbn_user';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

const VIDEO_CREDITS = 50;

function buildVideoPayload({
  prompt,
  negativePrompt,
  aspectRatio,
  durationSeconds,
  cameraMotion,
  rawPayload,
}) {
  if (rawPayload && typeof rawPayload === 'object') {
    return rawPayload;
  }

  return {
    instances: [
      {
        prompt,
      },
    ],
    parameters: {
      aspectRatio,
      durationSeconds: Number(durationSeconds) || 8,
      sampleCount: 1,
      personGeneration: 'allow_adult',
      ...(cameraMotion ? { cameraMotion } : {}),
      ...(negativePrompt ? { negativePrompt } : {}),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const {
    email,
    password,
    prompt,
    negativePrompt = '',
    aspectRatio = '16:9',
    durationSeconds = 8,
    cameraMotion = '',
    rawPayload = null,
  } = req.body || {};

  if (!email) {
    return res.status(401).json({ success: false, error: '请先登录后再生成视频' });
  }

  if (!password) {
    return res.status(401).json({ success: false, error: '请先完成账号验证' });
  }

  if (!prompt && !rawPayload) {
    return res.status(400).json({ success: false, error: '请输入视频描述' });
  }

  await ensureCreditsTables();

  let creditsDeducted = false;

  try {
    const userRows = await query('SELECT password_hash, credits FROM tbn_user_credits WHERE email = ? LIMIT 1', [email]);
    if (!userRows || userRows.length === 0) {
      return res.status(400).json({ success: false, error: '用户不存在，请先登录注册' });
    }

    if (!verifyPassword(password, userRows[0].password_hash)) {
      return res.status(401).json({ success: false, error: '账号验证失败，请重新登录' });
    }

    const currentCredits = Number(userRows[0].credits || 0);
    const updateResult = await query(
      'UPDATE tbn_user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?',
      [VIDEO_CREDITS, email, VIDEO_CREDITS]
    );

    if (!updateResult || updateResult.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        error: `积分不足，生成视频需要 ${VIDEO_CREDITS} 积分`,
        credits: currentCredits,
      });
    }

    creditsDeducted = true;

    const apiKey = process.env.VECTORENGINE_VIDEO_API_KEY || process.env.VECTORENGINE_API_KEY;
    const apiBase = process.env.VECTORENGINE_VIDEO_API_BASE || 'https://api.vectorengine.ai/v1beta';
    const model = process.env.VIDEO_MODEL || 'veo-3.1-fast-generate-preview';

    if (!apiKey) {
      throw new Error('VECTORENGINE_VIDEO_API_KEY or VECTORENGINE_API_KEY is not configured in .env');
    }

    const requestPayload = buildVideoPayload({
      prompt,
      negativePrompt,
      aspectRatio,
      durationSeconds,
      cameraMotion,
      rawPayload,
    });

    const response = await axios.post(
      `${apiBase}/models/${model}:predictLongRunning`,
      requestPayload,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );

    const balanceRows = await query('SELECT credits FROM tbn_user_credits WHERE email = ? LIMIT 1', [email]);
    const balanceAfter = Number(balanceRows?.[0]?.credits ?? currentCredits - VIDEO_CREDITS);

    await query(
      'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
      [email, 'consume', -VIDEO_CREDITS, balanceAfter, 'Video generation']
    );

    return res.json({
      success: true,
      cost: VIDEO_CREDITS,
      credits: balanceAfter,
      operationName: response.data?.name || response.data?.operationName || null,
      operation: response.data,
    });
  } catch (error) {
    if (creditsDeducted) {
      try {
        await query('UPDATE tbn_user_credits SET credits = credits + ? WHERE email = ?', [VIDEO_CREDITS, email]);
      } catch (refundError) {
        console.error('[TVideo] Failed to refund credits:', refundError.message);
      }
    }

    console.error('[TVideo] Generation failed:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error?.message || error.response?.data?.error || error.message || '视频任务提交失败',
    });
  }
}
