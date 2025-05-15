import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const rows = await query('SELECT * FROM pages ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('获取页面失败:', error);
    res.status(500).json({ error: '获取页面失败' });
  }
}