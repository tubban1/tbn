import { query } from '../../../lib/db';
import { verifyPassword } from '../../../lib/tbn_user';

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'string' && value.length > 1500000 && value.includes('data:image')) {
    return {
      originalUrl: null,
      freeimageUrl: 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Generated',
      isTemporary: true,
      uploadError: '图片已生成，但临时图片数据过大，无法通过状态接口直接返回。请检查阿里云 OSS 上传配置。'
    };
  }
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { taskId, email, password } = req.body || {};
  if (!taskId || !email || !password) {
    return res.status(401).json({ success: false, error: '登录状态已过期，请重新输入邮箱和密码。' });
  }

  try {
    const userRows = await query('SELECT password_hash FROM tbn_user_credits WHERE email = ? LIMIT 1', [email]);
    if (!userRows || userRows.length === 0 || !verifyPassword(password, userRows[0].password_hash)) {
      return res.status(401).json({ success: false, error: '账号密码不匹配，请重新登录。' });
    }

    const rows = await query(
      `SELECT id, email, status, result_payload, error_message, credits_cost, draw_image_id, created_at, updated_at
       FROM image_generation_tasks
       WHERE id = ? AND email = ?
       LIMIT 1`,
      [taskId, email]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = rows[0];
    return res.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        result: parseJson(task.result_payload, null),
        error: task.error_message,
        creditsCost: task.credits_cost,
        drawImageId: task.draw_image_id,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }
    });
  } catch (error) {
    console.error('[TImage Task Status] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch image generation task'
    });
  }
}
