import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { page_uid } = req.body;
  
  if (!page_uid) {
    return res.status(400).json({ error: '缺少页面ID' });
  }

  try {
    // 获取客户端IP和UA
    const ip_address = req.headers['x-forwarded-for'] || 
                       req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];
    
    // 记录访问
    await query(
      'INSERT INTO page_views (page_uid, ip_address, user_agent) VALUES (?, ?, ?)',
      [page_uid, ip_address, user_agent]
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('记录访问失败:', error);
    res.status(500).json({ error: '记录访问失败' });
  }
}